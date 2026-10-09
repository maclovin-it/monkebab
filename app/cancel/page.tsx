'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

function CancelContent() {
  const searchParams = useSearchParams();
  // The kebab composition (pain/viande/crudites/sauces — never anything
  // from Stripe) was already attached to cancel_url when the Checkout
  // session was created, server-side, before the customer ever reached
  // Stripe's payment form (see app/api/checkout/route.ts). Forwarding the
  // same query string to /tshirt mirrors its own "← RETOUR" backHref, so a
  // customer who backs out of payment doesn't have to recompose from
  // scratch.
  const query = searchParams.toString();
  const backHref = query ? `/tshirt?${query}` : '/tshirt';

  return (
    <main className={anton.className} style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Commande annulée</h1>
        <p style={styles.text}>Aucun paiement n&rsquo;a été effectué.</p>
        <Link href={backHref} style={styles.btn}>
          Retour au t-shirt
        </Link>
      </div>
    </main>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      <CancelContent />
    </Suspense>
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
    background: 'transparent',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textDecoration: 'none',
  },
};
