// Transactional email #2 — shipping notification, sent once Printful reports
// the order (or one of its shipments) as dispatched.
//
// Same visual identity as order-confirmation.ts: plain HTML string, table
// layout, inline styles. Email clients strip <head> CSS, flexbox and grid —
// keep it framework-free.

export const ORDER_SHIPPED_SUBJECT = '📦 Ton t-shirt kebab est en route !';

export interface OrderShippedData {
  /** Printful order id — shown so support can trace it. */
  reference: string;
  /** e.g. "USPS", "Colissimo". */
  carrier?: string;
  trackingNumber?: string;
  trackingUrl: string;
}

const BLACK = '#000000';
const PANEL = '#0a0a0a';
const WHITE = '#ffffff';
const BORDER = '#2e2e2e';
const MUTED = '#8a8a8a';
const INACTIVE = '#2a2a2a';

const CONDENSED = "'Anton', 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Narrow', Impact, Charcoal, 'Helvetica Neue', Arial, sans-serif";
const BODY_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const STEPS = [
  { label: 'Commande reçue', state: 'done' },
  { label: 'Impression', state: 'done' },
  { label: 'Expédition', state: 'done' },
  { label: 'Livraison', state: 'upcoming' },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function recapRow(label: string, value: string): string {
  if (!value) return '';
  return `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-family:${BODY_FONT};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};" valign="top">${escapeHtml(label)}</td>
                <td align="right" style="padding:10px 0;border-bottom:1px solid ${BORDER};font-family:${BODY_FONT};font-size:14px;color:${WHITE};font-weight:bold;" valign="top">${escapeHtml(value)}</td>
              </tr>`;
}

function progressBar(): string {
  const cells = STEPS.map((step, index) => {
    const done = step.state === 'done';
    const barColor = done ? WHITE : INACTIVE;
    const labelColor = done ? WHITE : MUTED;
    const paddingRight = index < STEPS.length - 1 ? 6 : 0;

    return `
                <td width="25%" valign="top" style="padding:0 ${paddingRight}px 0 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="height:4px;line-height:4px;font-size:0;background-color:${barColor};">&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="step-label" style="padding-top:8px;font-family:${BODY_FONT};font-size:11px;line-height:14px;letter-spacing:0.5px;text-transform:uppercase;color:${labelColor};">${escapeHtml(step.label)}</td>
                    </tr>
                  </table>
                </td>`;
  }).join('');

  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>${cells}
                </tr>
              </table>`;
}

export function renderOrderShippedHtml(data: OrderShippedData): string {
  const { reference, carrier, trackingNumber, trackingUrl } = data;

  const recap = [
    recapRow('Transporteur', carrier ?? ''),
    recapRow('N° de suivi', trackingNumber ?? ''),
    recapRow('Référence', reference),
  ].join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(ORDER_SHIPPED_SUBJECT)}</title>
  <style type="text/css">
    body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${BLACK}; }
    table { border-collapse:collapse; }
    img { -ms-interpolation-mode:bicubic; }
    a { color:${WHITE}; }
    @media only screen and (max-width:620px) {
      .container { width:100% !important; }
      .gutter { padding-left:20px !important; padding-right:20px !important; }
      .headline { font-size:30px !important; line-height:34px !important; }
      .step-label { font-size:9px !important; letter-spacing:0 !important; }
      .cta a { display:block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BLACK};">
  <!-- Preheader: shown in the inbox preview, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BLACK};">
    Ton colis a été confié au transporteur.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BLACK};">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${PANEL};border:1px solid ${BORDER};">

          <!-- Brand bar -->
          <tr>
            <td class="gutter" align="center" style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
              <span style="font-family:${CONDENSED};font-size:22px;letter-spacing:3px;text-transform:uppercase;color:${WHITE};">Mon Kebab</span>
            </td>
          </tr>

          <tr>
            <td class="gutter" style="padding:36px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- Headline -->
                <tr>
                  <td class="headline" style="font-family:${CONDENSED};font-size:38px;line-height:42px;letter-spacing:1px;text-transform:uppercase;color:${WHITE};padding:0 0 14px 0;">
                    Ta commande est expédiée
                  </td>
                </tr>
                <tr>
                  <td style="font-family:${BODY_FONT};font-size:15px;line-height:22px;color:${MUTED};padding:0 0 28px 0;">
                    Ton t-shirt kebab a été confié au transporteur, il arrive bientôt.
                  </td>
                </tr>

                <!-- Progress -->
                <tr>
                  <td style="padding:0 0 30px 0;">${progressBar()}
                  </td>
                </tr>

                <!-- Recap -->
                <tr>
                  <td style="padding:0 0 8px 0;font-family:${CONDENSED};font-size:16px;letter-spacing:2px;text-transform:uppercase;color:${WHITE};">
                    Ton suivi
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 30px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BORDER};">${recap}
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr class="cta">
                  <td align="center" style="padding:0 0 34px 0;">
                    <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;font-family:${BODY_FONT};font-size:14px;font-weight:bold;letter-spacing:0.5px;color:${BLACK};background-color:${WHITE};text-decoration:none;padding:14px 28px;">Suivre mon colis</a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="gutter" style="padding:24px 32px 30px 32px;border-top:1px solid ${BORDER};font-family:${BODY_FONT};font-size:12px;line-height:19px;color:${MUTED};">
              Une question sur ta livraison ? <a href="mailto:contact@monkebab.xyz" style="color:${WHITE};text-decoration:underline;">contact@monkebab.xyz</a>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative — improves deliverability and covers text-only clients. */
export function renderOrderShippedText(data: OrderShippedData): string {
  const lines = [
    'TA COMMANDE EST EXPÉDIÉE',
    '',
    'Ton t-shirt kebab a été confié au transporteur, il arrive bientôt.',
    '',
    'Suivi : Commande reçue ✓ · Impression ✓ · Expédition ✓ · Livraison',
    '',
    'TON SUIVI',
  ];

  const recap: Array<[string, string]> = [
    ['Transporteur', data.carrier ?? ''],
    ['N° de suivi', data.trackingNumber ?? ''],
    ['Référence', data.reference],
  ];

  for (const [label, value] of recap) {
    if (value) lines.push(`- ${label} : ${value}`);
  }

  lines.push(
    '',
    `Suivre mon colis : ${data.trackingUrl}`,
    '',
    'Une question sur ta livraison ? contact@monkebab.xyz',
  );

  return lines.join('\n');
}
