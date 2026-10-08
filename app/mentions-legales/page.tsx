'use client';

import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

export default function MentionsLegalesPage() {
  return (
    <main className={anton.className}>
      <header className="topBar">
        <Link href="/" className="backLink">
          ← RETOUR
        </Link>
        <h1>MENTIONS LÉGALES</h1>
        <div className="spacer" />
      </header>

      <div className="content">
        <p className="intro">
          Ces mentions légales identifient l&rsquo;éditeur du site Mon Kebab (monkebab.xyz). Pour les conditions de
          vente, voir nos <Link href="/cgv">CGV</Link> ; pour le détail des données personnelles traitées, voir notre{' '}
          <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
        </p>

        <section className="section">
          <h2>Éditeur du site</h2>
          <p>
            Le site Mon Kebab (monkebab.xyz) est édité par une entreprise individuelle.
          </p>
          <p className="placeholder">
            Nom et prénom de l&rsquo;exploitant : [à compléter]
            <br />
            Forme juridique : Entreprise individuelle
            <br />
            SIREN : [à compléter]
            <br />
            Adresse professionnelle : [à compléter — adresse professionnelle, pas une adresse personnelle]
            <br />
            Directeur de la publication : [à compléter]
          </p>
        </section>

        <section className="section">
          <h2>Informations sur l&rsquo;entreprise</h2>
          <p className="placeholder">
            SIRET de l&rsquo;établissement : [à compléter]
            <br />
            Numéro de TVA intracommunautaire : [à compléter, ou &laquo;&nbsp;non applicable&nbsp;&raquo; selon le régime fiscal]
          </p>
        </section>

        <section className="section">
          <h2>Contact</h2>
          <p>
            Pour toute question relative au site ou aux commandes :{' '}
            <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>
          </p>
        </section>

        <section className="section">
          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par :
            <br />
            Vercel Inc.
            <br />
            340 S. Lemon Ave #4133, Walnut, CA 91789, États-Unis
            <br />
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
              vercel.com
            </a>
          </p>
        </section>

        <section className="section">
          <h2>Propriété intellectuelle</h2>
          <p>
            L&rsquo;ensemble des contenus présents sur ce site (textes, visuels, logo, identité &laquo;&nbsp;Mon
            Kebab&nbsp;&raquo;, mise en page, code source) est protégé par le droit de la propriété intellectuelle et
            reste la propriété exclusive de l&rsquo;éditeur, sauf mention contraire. Toute reproduction, représentation
            ou utilisation, totale ou partielle, sans autorisation préalable est interdite.
          </p>
        </section>

        <section className="section">
          <h2>Responsabilité</h2>
          <p>
            L&rsquo;éditeur s&rsquo;efforce d&rsquo;assurer l&rsquo;exactitude et la mise à jour des informations
            diffusées sur ce site, sans garantie d&rsquo;exhaustivité. L&rsquo;éditeur ne pourra être tenu responsable
            des erreurs, d&rsquo;une indisponibilité du site ou de l&rsquo;usage qui pourrait en être fait. Le site peut
            contenir des liens vers des sites tiers (ex. Stripe, Printful) dont le contenu n&rsquo;engage que leurs
            éditeurs respectifs.
          </p>
        </section>
      </div>

      <style jsx>{`
        main {
          min-height: 100vh;
          background: #000;
          color: #fff;
          padding: 20px 24px 60px;
          box-sizing: border-box;
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .backLink {
          color: #fff;
          text-decoration: none;
          font-size: 0.88rem;
          letter-spacing: 0.12em;
          opacity: 0.72;
          transition: opacity 0.2s;
          white-space: nowrap;
          min-width: 80px;
        }

        .backLink:hover {
          opacity: 1;
        }

        h1 {
          margin: 0;
          font-size: clamp(1.2rem, 3.4vw, 2.2rem);
          letter-spacing: 0.12em;
          text-align: center;
          flex: 1;
        }

        .spacer {
          min-width: 80px;
        }

        .content {
          max-width: 680px;
          margin: 0 auto;
          font-family: var(--font-geist-sans), Arial, sans-serif;
        }

        .intro {
          margin: 0 0 36px;
          font-size: 0.92rem;
          line-height: 1.7;
          color: #fff;
          opacity: 0.85;
        }

        .intro a {
          color: #fff;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .section {
          margin-bottom: 36px;
        }

        .section h2 {
          font-family: inherit;
          font-size: 0.82rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0 0 12px;
          color: #fff;
        }

        .section p {
          margin: 0 0 10px;
          font-size: 0.92rem;
          line-height: 1.7;
          color: #fff;
          opacity: 0.8;
        }

        .section p:last-child {
          margin-bottom: 0;
        }

        .section a {
          color: #fff;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .placeholder {
          opacity: 0.6 !important;
          font-style: italic;
        }

        @media (max-width: 600px) {
          main {
            padding: 16px 16px 72px;
          }

          .topBar {
            margin-bottom: 24px;
          }

          h1 {
            font-size: 1.05rem;
          }

          .backLink,
          .spacer {
            min-width: 60px;
          }
        }
      `}</style>
    </main>
  );
}
