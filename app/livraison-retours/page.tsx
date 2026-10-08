'use client';

import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

export default function LivraisonRetoursPage() {
  return (
    <main className={anton.className}>
      <header className="topBar">
        <Link href="/" className="backLink">
          ← RETOUR
        </Link>
        <h1>LIVRAISON ET RETOURS</h1>
        <div className="spacer" />
      </header>

      <div className="content">
        <p className="intro">
          Cette page résume, en langage simple, comment votre commande est fabriquée, livrée, et ce que vous pouvez
          faire en cas de problème. Elle ne crée aucune condition différente de nos{' '}
          <Link href="/cgv">CGV</Link>, qui restent le texte de référence.
        </p>

        <section className="section">
          <h2>1. Fabrication à la demande</h2>
          <p>
            Chaque t-shirt Mon Kebab est personnalisé par vous (pain, viande, crudités, sauces), puis fabriqué à la
            demande par notre partenaire de production et d&rsquo;impression Printful, une fois votre paiement
            confirmé. Aucun stock n&rsquo;est constitué à l&rsquo;avance : votre exemplaire est produit spécifiquement
            pour votre commande.
          </p>
        </section>

        <section className="section">
          <h2>2. Pays desservis</h2>
          <p>Nous livrons actuellement en France métropolitaine, en Belgique et au Luxembourg.</p>
        </section>

        <section className="section">
          <h2>3. Prix</h2>
          <p>
            Le prix de 29,99&nbsp;€ TTC inclut la livraison, quelle que soit la destination parmi les pays desservis
            ci-dessus. Aucun frais de port supplémentaire ne vous sera demandé.
          </p>
        </section>

        <section className="section">
          <h2>4. Délais de livraison</h2>
          <p>
            Conformément à nos CGV, et sauf circonstance exceptionnelle, votre commande est livrée au plus tard :
            <br />
            — 12 jours ouvrés après la confirmation du paiement, pour la France métropolitaine ;
            <br />
            — 15 jours ouvrés après la confirmation du paiement, pour la Belgique et le Luxembourg.
          </p>
          <p>
            Ce délai couvre l&rsquo;ensemble du processus, de la fabrication par Printful jusqu&rsquo;à la livraison
            à votre adresse. Le détail des recours en cas de dépassement de ce délai figure à l&rsquo;
            <Link href="/cgv">article 6 des CGV</Link>.
          </p>
        </section>

        <section className="section">
          <h2>5. Suivi de commande</h2>
          <p>
            Vous recevez un e-mail de confirmation dès que votre commande est enregistrée, puis un second e-mail dès
            qu&rsquo;elle est expédiée, avec un lien de suivi du transporteur lorsqu&rsquo;il est disponible.
          </p>
        </section>

        <section className="section">
          <h2>6. Retours et rétractation</h2>
          <p>
            Chaque t-shirt étant fabriqué à la demande selon la composition de kebab que vous avez choisie, il
            s&rsquo;agit d&rsquo;un bien nettement personnalisé au sens de l&rsquo;article L221-28, 3° du Code de la
            consommation : le délai de rétractation de 14 jours applicable aux ventes à distance ne s&rsquo;applique
            donc pas une fois la commande validée et payée.
          </p>
          <p>
            Cette exception ne remet en cause aucune de vos garanties légales, décrites à l&rsquo;article 8
            ci-dessous.
          </p>
        </section>

        <section className="section">
          <h2>7. Problème avec votre commande</h2>
          <p>
            Si votre colis semble perdu, arrive endommagé, comporte une erreur d&rsquo;impression, ou si le produit
            reçu n&rsquo;est pas conforme à votre commande, contactez-nous à{' '}
            <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>, si possible en joignant une photo du produit
            ou du colis reçu. Nous nous chargeons des démarches nécessaires auprès de Printful pour résoudre la
            situation.
          </p>
        </section>

        <section className="section">
          <h2>8. Remboursements et garanties</h2>
          <p>
            Selon les circonstances, vous pouvez obtenir le remplacement du produit, sa mise en conformité, ou le
            remboursement de la commande. Le fait que le suivi du transporteur indique que le colis a été livré ne
            vous prive pas de vos droits : si vous affirmez ne pas avoir reçu votre colis, nous examinons la
            situation au cas par cas.
          </p>
          <p>
            Indépendamment de ce qui précède, vous bénéficiez, sur toute commande, de la garantie légale de
            conformité (articles L217-3 et suivants du Code de la consommation) et de la garantie légale des vices
            cachés (articles 1641 et suivants du Code civil).
          </p>
          <p>
            Pour le détail complet de ces règles, voir nos <Link href="/cgv">CGV</Link>, notamment les articles 6, 7
            et 9.
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
