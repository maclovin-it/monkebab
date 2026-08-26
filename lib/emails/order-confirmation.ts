// Transactional email #1 — order confirmation, sent once the Stripe session is
// verified and the Printful order exists.
//
// Rendered as a plain HTML string (table layout, inline styles) because email
// clients strip <head> CSS, flexbox and grid. Keep it framework-free.

export const ORDER_CONFIRMATION_SUBJECT = '🌯 Ta commande est passée en cuisine !';

export interface OrderConfirmationData {
  /** Bread choice, e.g. "Galette". */
  bread?: string;
  /** Meat choice, e.g. "Poulet". */
  meat?: string;
  /** Comma-separated list as stored in Stripe metadata. */
  vegetables?: string;
  /** Comma-separated list as stored in Stripe metadata. */
  sauces?: string;
  /** T-shirt size, e.g. "L". */
  size?: string;
  /** Pre-formatted amount, e.g. "29,99 €". */
  amountPaid: string;
  /** Stripe session id or Printful order id — shown so support can trace it. */
  reference: string;
  /** Public URL of a t-shirt mockup. Omit for no image (never pass the bare print file). */
  mockupUrl?: string;
  /** CTA target. */
  ctaUrl?: string;
  /** CTA label. */
  ctaLabel?: string;
}

const BLACK = '#000000';
const PANEL = '#0a0a0a';
const WHITE = '#ffffff';
const BORDER = '#2e2e2e';
const MUTED = '#8a8a8a';
const INACTIVE = '#2a2a2a';

// Condensed stack: Anton only lands in clients that allow web fonts, so the
// fallbacks carry the design. Haettenschweiler (Windows) and Impact (macOS +
// Windows) are the email-safe condensed faces.
const CONDENSED = "'Anton', 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Narrow', Impact, Charcoal, 'Helvetica Neue', Arial, sans-serif";
const BODY_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const STEPS = [
  { label: 'Commande reçue', state: 'done' },
  { label: 'Impression', state: 'upcoming' },
  { label: 'Expédition', state: 'upcoming' },
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

/** "Salade,Tomate" -> "Salade · Tomate". Returns '' when nothing usable. */
function formatList(value?: string): string {
  if (!value) return '';
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' · ');
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

function mockupBlock(mockupUrl?: string): string {
  if (!mockupUrl) return '';

  return `
              <tr>
                <td style="padding:0 0 28px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};">
                    <tr>
                      <td align="center" style="padding:16px;background-color:${BLACK};">
                        <img src="${escapeHtml(mockupUrl)}" alt="Ton t-shirt Mon Kebab" width="360" style="display:block;width:100%;max-width:360px;height:auto;border:0;outline:none;text-decoration:none;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

export function renderOrderConfirmationHtml(data: OrderConfirmationData): string {
  const {
    bread,
    meat,
    vegetables,
    sauces,
    size,
    amountPaid,
    reference,
    mockupUrl,
    ctaUrl = 'https://monkebab.xyz',
    ctaLabel = 'Retourner sur Mon Kebab',
  } = data;

  const recap = [
    recapRow('Pain', bread ?? ''),
    recapRow('Viande', meat ?? ''),
    recapRow('Crudités', formatList(vegetables)),
    recapRow('Sauces', formatList(sauces)),
    recapRow('Taille', size ?? ''),
    recapRow('Montant payé', amountPaid),
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
  <title>${escapeHtml(ORDER_CONFIRMATION_SUBJECT)}</title>
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
    Ton t-shirt kebab est maintenant en préparation.
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
                    Ta commande est passée en cuisine
                  </td>
                </tr>
                <tr>
                  <td style="font-family:${BODY_FONT};font-size:15px;line-height:22px;color:${MUTED};padding:0 0 28px 0;">
                    Ton t-shirt kebab est maintenant en préparation.
                  </td>
                </tr>

                <!-- Progress -->
                <tr>
                  <td style="padding:0 0 30px 0;">${progressBar()}
                  </td>
                </tr>
${mockupBlock(mockupUrl)}
                <!-- Recap -->
                <tr>
                  <td style="padding:0 0 8px 0;font-family:${CONDENSED};font-size:16px;letter-spacing:2px;text-transform:uppercase;color:${WHITE};">
                    Ta commande
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 30px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BORDER};">${recap}
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding:0 0 34px 0;">
                    <a href="${escapeHtml(ctaUrl)}" style="font-family:${BODY_FONT};font-size:13px;letter-spacing:0.5px;color:${MUTED};text-decoration:underline;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="gutter" style="padding:24px 32px 30px 32px;border-top:1px solid ${BORDER};font-family:${BODY_FONT};font-size:12px;line-height:19px;color:${MUTED};">
              Tu recevras un nouvel e-mail avec ton lien de suivi dès que ton t-shirt sera expédié.<br />
              Une question ? <a href="mailto:contact@monkebab.xyz" style="color:${WHITE};text-decoration:underline;">contact@monkebab.xyz</a>
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
export function renderOrderConfirmationText(data: OrderConfirmationData): string {
  const lines = [
    'TA COMMANDE EST PASSÉE EN CUISINE',
    '',
    'Ton t-shirt kebab est maintenant en préparation.',
    '',
    'Suivi : Commande reçue ✓ · Impression · Expédition · Livraison',
    '',
    'TA COMMANDE',
  ];

  const recap: Array<[string, string]> = [
    ['Pain', data.bread ?? ''],
    ['Viande', data.meat ?? ''],
    ['Crudités', formatList(data.vegetables)],
    ['Sauces', formatList(data.sauces)],
    ['Taille', data.size ?? ''],
    ['Montant payé', data.amountPaid],
    ['Référence', data.reference],
  ];

  for (const [label, value] of recap) {
    if (value) lines.push(`- ${label} : ${value}`);
  }

  lines.push(
    '',
    data.ctaUrl ?? 'https://monkebab.xyz',
    '',
    'Tu recevras un nouvel e-mail avec ton lien de suivi dès que ton t-shirt sera expédié.',
    'Une question ? contact@monkebab.xyz',
  );

  return lines.join('\n');
}
