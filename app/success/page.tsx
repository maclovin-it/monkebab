import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

export default function SuccessPage() {
  return (
    <main className={anton.className} style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Commande reçue</h1>
        <p style={styles.text}>Paiement validé. Ton t-shirt est en préparation.</p>
        <Link href="/" style={styles.btn}>
          Retour à l'accueil
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
