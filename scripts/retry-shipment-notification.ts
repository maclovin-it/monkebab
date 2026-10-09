// Manual recovery for a shipment-tracking email stuck at 'failed' (or
// 'pending' and abandoned after a crash — see listReclaimableShipmentNotifications
// in lib/fulfillment/db.ts) in `shipment_notifications`, for when Printful
// never redelivers its package_shipped webhook on its own — the webhook
// route always answers Printful with 200 regardless of what happened
// internally, so there's no automatic retry to rely on; see
// sendShipmentNotificationFailedAlert's doc comment for why.
//
// Deliberately a script, not a new HTTP route: no new public surface, no
// new authentication mechanism to design or get wrong — it runs locally
// (or wherever DATABASE_URL/PRINTFUL_API_KEY/PRINTFUL_STORE_ID/RESEND_API_KEY
// are available) by whoever already holds those secrets, the same trust
// boundary as scripts/backfill-historical-orders.ts.
//
// Never fabricates a Printful webhook payload: it fetches the order fresh
// from Printful's own authenticated API (same getOrder() the real webhook
// uses) and runs it through notifyShipment() — the exact same
// claim/send/settle/alert logic a real webhook delivery would, just
// triggered by hand instead of by Printful.
//
// Usage:
//   npx tsx scripts/retry-shipment-notification.ts --list
//     Lists every notification currently stuck (status 'failed', or
//     'pending' and older than the 2-minute staleness window) — read-only,
//     sends nothing.
//
//   npx tsx scripts/retry-shipment-notification.ts --order-id=12345678
//     Retries every shipment on that order that isn't already 'sent' —
//     handles multi-package orders in one call.
//
//   npx tsx scripts/retry-shipment-notification.ts --order-id=12345678 --shipment-id=98765
//     Retries only that one shipment.

import { getOrder } from '../lib/printful';
import { notifyShipment } from '../lib/fulfillment/shipment-notify';
import { listReclaimableShipmentNotifications } from '../lib/fulfillment/db';

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'PRINTFUL_API_KEY', 'PRINTFUL_STORE_ID', 'RESEND_API_KEY'] as const;

function parseArgs(): { list: boolean; orderId?: string; shipmentId?: number } {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value ?? 'true'];
    })
  );

  const shipmentIdRaw = args.get('shipment-id');

  return {
    list: args.has('list'),
    orderId: args.get('order-id'),
    shipmentId: shipmentIdRaw ? Number(shipmentIdRaw) : undefined,
  };
}

function checkEnv(): boolean {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variable(s): ${missing.join(', ')}`);
    return false;
  }
  return true;
}

async function runList() {
  const rows = await listReclaimableShipmentNotifications();

  if (rows.length === 0) {
    console.log('Nothing stuck — no failed or abandoned-pending shipment notifications.');
    return;
  }

  console.log(`${rows.length} stuck shipment notification(s):\n`);
  for (const row of rows) {
    console.log(
      `  order=${row.printfulOrderId}  shipment=${row.printfulShipmentId}  status=${row.status}  ` +
        `attempts=${row.attempts}  updated_at=${row.updatedAt}` +
        (row.lastError ? `\n    last_error: ${row.lastError}` : '')
    );
  }
  console.log(
    '\nRetry one with:\n  npx tsx scripts/retry-shipment-notification.ts --order-id=<order> --shipment-id=<shipment>'
  );
}

async function runRetry(orderId: string, shipmentId?: number) {
  const { status, body } = await getOrder(orderId);

  if (status !== 200 || !body?.result) {
    console.error(`Failed to fetch Printful order ${orderId}:`, status, body);
    process.exitCode = 1;
    return;
  }

  const order = body.result;
  const shipments = order.shipments ?? [];

  if (shipments.length === 0) {
    console.error(`Order ${orderId} has no shipments on Printful's side yet — nothing to notify.`);
    process.exitCode = 1;
    return;
  }

  const targets = shipmentId ? shipments.filter((s) => s.id === shipmentId) : shipments;

  if (targets.length === 0) {
    console.error(`Shipment ${shipmentId} not found on order ${orderId}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Retrying ${targets.length} shipment(s) for order ${orderId}...`);

  for (const shipment of targets) {
    const outcome = await notifyShipment({ order, shipment });
    console.log(`  shipment ${shipment.id}: ${outcome}`);
  }
}

async function main() {
  if (!checkEnv()) {
    process.exitCode = 1;
    return;
  }

  const { list, orderId, shipmentId } = parseArgs();

  if (list) {
    await runList();
    return;
  }

  if (!orderId) {
    console.error(
      'Usage:\n' +
        '  npx tsx scripts/retry-shipment-notification.ts --list\n' +
        '  npx tsx scripts/retry-shipment-notification.ts --order-id=<printful order id> [--shipment-id=<printful shipment id>]'
    );
    process.exitCode = 1;
    return;
  }

  await runRetry(orderId, shipmentId);
}

main().catch((err) => {
  // Most likely cause: migration 0003 not applied yet (relation does not
  // exist) — a clean one-line message beats a raw stack trace for a script
  // meant to be run by hand.
  const message = err instanceof Error ? err.message : String(err);
  console.error('Failed:', message);
  process.exitCode = 1;
});
