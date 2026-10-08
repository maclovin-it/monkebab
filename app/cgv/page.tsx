'use client';

import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

export default function CgvPage() {
  return (
    <main className={anton.className}>
      <header className="topBar">
        <Link href="/" className="backLink">
          ← RETOUR
        </Link>
        <h1>CONDITIONS GÉNÉRALES DE VENTE</h1>
        <div className="spacer" />
      </header>

      <div className="content">
        <p className="intro">
          Les présentes conditions générales de vente (les &laquo;&nbsp;CGV&nbsp;&raquo;) s&rsquo;appliquent à toute
          commande passée sur le site Mon Kebab (monkebab.xyz) par un client consommateur. Passer commande implique
          l&rsquo;acceptation pleine et entière des présentes CGV.
        </p>

        <section className="section">
          <h2>1. Le vendeur</h2>
          <p>
            Le site Mon Kebab est exploité par iseeyou., entreprise individuelle.
          </p>
          <p className="placeholder">
            SIREN : [à compléter]
            <br />
            Adresse professionnelle : [à compléter — adresse professionnelle, pas une adresse personnelle]
            <br />
            Pour plus de détails sur l&rsquo;éditeur, voir les{' '}
            <Link href="/mentions-legales">mentions légales</Link>.
          </p>
          <p>
            Contact : <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>
          </p>
        </section>

        <section className="section">
          <h2>2. Les produits</h2>
          <p>
            Mon Kebab propose un seul type de produit : un t-shirt imprimé à la demande, personnalisé à partir de la
            composition de kebab (pain, viande, crudités, sauces) choisie par le client via le configurateur du site.
            Chaque t-shirt est donc unique et fabriqué spécifiquement pour la commande concernée, après paiement.
          </p>
          <p>
            Le visuel imprimé correspond exactement à l&rsquo;aperçu affiché au client avant la validation de la
            commande. Aucun stock n&rsquo;est constitué à l&rsquo;avance : chaque exemplaire est produit à
            l&rsquo;unité.
          </p>
        </section>

        <section className="section">
          <h2>3. Prix</h2>
          <p>
            Le prix du t-shirt est de 29,99&nbsp;€ TTC (toutes taxes comprises), livraison incluse, pour les
            destinations actuellement desservies : France métropolitaine, Belgique et Luxembourg. Ce prix est celui en
            vigueur au moment de la commande et peut être amené à évoluer, sans effet sur les commandes déjà payées.
          </p>
          <p className="placeholder">
            Mention de TVA applicable sur facture (selon le régime fiscal du vendeur) : [à confirmer]
          </p>
        </section>

        <section className="section">
          <h2>4. Commande</h2>
          <p>
            Le client compose son kebab via le configurateur du site, choisit une taille de t-shirt, puis procède au
            paiement. La commande n&rsquo;est considérée comme définitive qu&rsquo;à compter de la confirmation du
            paiement par notre prestataire de paiement. Un e-mail de confirmation récapitulant la commande est envoyé
            au client dès que le paiement est validé.
          </p>
        </section>

        <section className="section">
          <h2>5. Paiement</h2>
          <p>
            Le paiement s&rsquo;effectue en ligne, intégralement et par avance, via Stripe Checkout, solution de
            paiement sécurisée. Les moyens de paiement proposés (carte bancaire et éventuels moyens de paiement
            locaux) sont ceux affichés par Stripe au moment du paiement. Mon Kebab n&rsquo;a accès à aucune donnée
            bancaire du client : celles-ci sont traitées exclusivement par Stripe.
          </p>
        </section>

        <section className="section">
          <h2>6. Fabrication et expédition</h2>
          <p>
            Chaque t-shirt est fabriqué à la demande, après confirmation du paiement, par notre partenaire de
            production et d&rsquo;impression Printful. Le vendeur s&rsquo;efforce d&rsquo;expédier chaque commande
            sous 3 à 5 jours ouvrés à compter de la confirmation du paiement, tel qu&rsquo;indiqué au client lors de la
            commande.
          </p>
          <p className="placeholder">
            Délai de livraison total (fabrication + transport) selon la destination : [à confirmer]
            <br />
            Politique en cas de colis perdu, endommagé ou non livré : [à confirmer]
          </p>
        </section>

        <section className="section">
          <h2>7. Droit de rétractation</h2>
          <p>
            Conformément à l&rsquo;article L221-28, 3° du Code de la consommation, le droit de rétractation de 14
            jours prévu pour les ventes à distance ne s&rsquo;applique pas aux biens confectionnés selon les
            spécifications du consommateur ou nettement personnalisés. Chaque t-shirt Mon Kebab étant fabriqué à la
            demande selon la composition de kebab librement choisie par le client, il entre dans le champ de cette
            exception : aucune rétractation ne peut donc être exercée une fois la commande validée et payée.
          </p>
        </section>

        <section className="section">
          <h2>8. Garanties légales</h2>
          <p>
            L&rsquo;absence de droit de rétractation est sans incidence sur les garanties légales, qui
            s&rsquo;appliquent à toute commande quel que soit le caractère personnalisé du produit :
          </p>
          <p>
            — la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation), qui permet
            au client de demander la réparation ou le remplacement d&rsquo;un bien non conforme ;
            <br />
            — la garantie légale des vices cachés (articles 1641 et suivants du Code civil), qui permet au client de
            demander la résolution de la vente ou une réduction du prix en cas de défaut caché rendant le bien
            impropre à son usage.
          </p>
          <p>
            Pour faire valoir ces garanties, le client peut contacter <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>.
          </p>
        </section>

        <section className="section">
          <h2>9. Réclamations et service client</h2>
          <p>
            Pour toute question, réclamation ou demande relative à une commande, le client peut contacter le vendeur à
            l&rsquo;adresse <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>.
          </p>
        </section>

        <section className="section">
          <h2>10. Médiation de la consommation</h2>
          <p>
            Conformément aux articles L616-1 et R616-1 du Code de la consommation, tout consommateur a le droit de
            recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d&rsquo;un litige
            qui n&rsquo;aurait pas pu être réglé directement auprès du vendeur.
          </p>
          <p className="placeholder">
            Nom, coordonnées et site internet du médiateur de la consommation désigné : [à compléter — étape
            obligatoire avant la mise en ligne de ces CGV]
          </p>
        </section>

        <section className="section">
          <h2>11. Droit applicable et litiges</h2>
          <p>
            Les présentes CGV sont soumises au droit français. Pour les clients résidant dans un autre État membre de
            l&rsquo;Union européenne (Belgique, Luxembourg), les dispositions impératives de protection du
            consommateur prévues par le droit de leur pays de résidence demeurent applicables. À défaut de résolution
            amiable, et sous réserve des règles de compétence impératives applicables aux litiges de consommation, les
            tribunaux français seront compétents.
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
