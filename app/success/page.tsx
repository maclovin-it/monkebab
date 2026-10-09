import Link from 'next/link';
import { Anton } from 'next/font/google';
import { getStripe } from '@/lib/stripe';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

type SessionState = 'paid' | 'pending' | 'unavailable';

/**
 * Read-only check against Stripe — never touches Printful, the
 * `fulfillments` table, or `orders`. The webhook (app/api/webhook/route.ts)
 * remains the sole trigger for fulfillment and stats; this only decides
 * what to *show* the visitor who landed here.
 *
 * Three outcomes, not two: a session that completed Checkout but used a
 * delayed payment method (e.g. a bank transfer) legitimately has
 * payment_status 'unpaid' at this exact moment — that's not the same
 * situation as no session_id at all, or a session_id Stripe doesn't
 * recognize, so it gets its own message rather than being lumped into
 * "unavailable".
 */
async function getSessionState(sessionId: string | undefined): Promise<SessionState> {
  if (!sessionId) return 'unavailable';

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') return 'paid';
    if (session.status === 'complete') return 'pending';
    return 'unavailable';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[success] failed to verify session', sessionId, message);
    return 'unavailable';
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const state = await getSessionState(sessionId);

  return (
    <main className={anton.className} style={styles.page}>
      <div style={styles.card}>
        {state === 'paid' && (
          <>
            <h1 style={styles.title}>Commande reçue</h1>
            <p style={{ marginTop: '16px' }}>Ton kebab vient de passer en cuisine...</p>
            <p style={{ opacity: 0.6, marginTop: '8px' }}>Préparation du t-shirt en cours 🥙👕</p>
          </>
        )}

        {state === 'pending' && (
          <>
            <h1 style={styles.title}>Paiement en cours</h1>
            <p style={{ ...styles.text, marginTop: '16px' }}>
              On a bien reçu ta commande. La confirmation du paiement est en cours — tu recevras un e-mail dès que
              c&rsquo;est validé.
            </p>
          </>
        )}

        {state === 'unavailable' && (
          <>
            <h1 style={styles.title}>Statut indisponible</h1>
            <p style={{ ...styles.text, marginTop: '16px' }}>
              On n&rsquo;a pas pu confirmer de commande ici. Si tu viens de payer, tu vas recevoir un e-mail de
              confirmation sous peu — sinon, écris-nous à{' '}
              <a href="mailto:hello@monkebab.xyz" style={{ color: '#fff' }}>
                hello@monkebab.xyz
              </a>
              .
            </p>
          </>
        )}

        <Link href="/" style={styles.btn}>
          Retour à l&rsquo;accueil
        </Link>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(2rem, 6vw, 3.5rem)',
    letterSpacing: '0.12em',
  },
  text: {
    margin: 0,
    fontSize: '1rem',
    letterSpacing: '0.06em',
    opacity: 0.7,
    lineHeight: 1.6,
  },
  btn: {
    display: 'inline-block',
    padding: '14px 32px',
    border: '1px solid #fff',
    background: '#fff',
    color: '#000',
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textDecoration: 'none',
  },
};
