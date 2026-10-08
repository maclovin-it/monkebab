'use client';

import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

export default function PolitiqueConfidentialitePage() {
  return (
    <main className={anton.className}>
      <header className="topBar">
        <Link href="/" className="backLink">
          ← RETOUR
        </Link>
        <h1>POLITIQUE DE CONFIDENTIALITÉ</h1>
        <div className="spacer" />
      </header>

      <div className="content">
        <p className="intro">
          La présente politique explique quelles données sont traitées lorsque vous utilisez le site Mon Kebab
          (monkebab.xyz), pourquoi, avec qui elles sont partagées, et quels sont vos droits. Elle complète les{' '}
          <Link href="/cgv">conditions générales de vente</Link> et les{' '}
          <Link href="/mentions-legales">mentions légales</Link>.
        </p>

        <section className="section">
          <h2>1. Qui est responsable du traitement</h2>
          <p>
            Le site Mon Kebab est édité par une entreprise individuelle, responsable du traitement des données
            décrites dans la présente politique.
          </p>
          <p className="placeholder">
            Nom et prénom de l&rsquo;exploitant : [à compléter]
            <br />
            SIREN : [à compléter]
            <br />
            Adresse professionnelle : [à compléter — adresse professionnelle, pas une adresse personnelle]
          </p>
          <p>
            Pour toute question relative à vos données personnelles : <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>.
          </p>
        </section>

        <section className="section">
          <h2>2. Quelles données nous collectons</h2>
          <p>
            — La composition de votre kebab (pain, viande, crudités, sauces) et la taille de t-shirt choisie : une
            donnée produit, rattachée à votre commande.
            <br />
            — Votre nom, votre e-mail et votre adresse de livraison : saisis directement sur la page de paiement
            sécurisée fournie par Stripe, jamais sur nos propres formulaires.
            <br />
            — Votre choix concernant les cookies de mesure d&rsquo;audience (« accepté » ou « refusé ») : enregistré
            uniquement sur votre appareil.
            <br />
            — Si vous avez accepté ce suivi : un identifiant de navigateur pseudonyme et des événements de
            navigation (pages consultées, étapes de la commande), décrits en détail à l&rsquo;article 4.
          </p>
        </section>

        <section className="section">
          <h2>3. Pourquoi nous utilisons ces données</h2>
          <p>
            — Traiter votre commande, la faire fabriquer et expédier, assurer le suivi et le service après-vente :
            cette utilisation est nécessaire à l&rsquo;exécution du contrat qui nous lie dès que vous passez commande.
            <br />
            — Traiter le paiement : nécessaire à l&rsquo;exécution du contrat et, pour Stripe, à ses propres
            obligations légales (notamment en matière de lutte contre la fraude).
            <br />
            — Mesurer la fréquentation du site (Google Analytics 4) : uniquement sur la base de votre consentement,
            recueilli via le bandeau affiché lors de votre première visite.
          </p>
        </section>

        <section className="section">
          <h2>4. Avec qui nous partageons vos données</h2>
          <p>
            <strong>Stripe</strong> (paiement) — collecte directement votre nom, votre e-mail, votre adresse de
            livraison et vos informations de paiement sur sa propre page sécurisée ; nous ne voyons ni ne stockons
            jamais votre numéro de carte. Le rôle exact de Stripe (sous-traitant ou responsable de traitement
            distinct selon la donnée concernée) est précisé dans sa propre politique de confidentialité :
            [lien à ajouter après vérification].
          </p>
          <p>
            <strong>Printful</strong> (fabrication et expédition) — reçoit votre nom, votre e-mail et votre adresse
            de livraison complète, ainsi que le visuel de votre t-shirt, afin de fabriquer et d&rsquo;expédier votre
            commande. Printful, Inc. est une société basée aux États-Unis ; voir l&rsquo;article 6 sur les transferts
            hors Union européenne.
          </p>
          <p>
            <strong>Resend</strong> (envoi des e-mails) — reçoit votre e-mail et le contenu de votre commande
            (composition, taille, montant payé, référence) pour vous envoyer l&rsquo;e-mail de confirmation de
            commande, puis votre e-mail et vos informations de suivi de colis pour l&rsquo;e-mail d&rsquo;expédition.
          </p>
          <p>
            <strong>Neon</strong> (notre base de données) — héberge les données que nous conservons nous-mêmes :
            d&rsquo;un côté, la composition de votre kebab associée à l&rsquo;identifiant de votre session de paiement
            Stripe, à des fins de statistiques internes ; de l&rsquo;autre, votre e-mail et la taille choisie,
            associés au même identifiant, pour suivre l&rsquo;avancement de la fabrication auprès de Printful. Nous
            ne stockons nous-mêmes ni votre adresse postale, ni vos informations de paiement.
          </p>
          <p>
            <strong>Google</strong> (Google Analytics 4) — uniquement si vous avez cliqué sur « Accepter » dans le
            bandeau de cookies (voir l&rsquo;article 7). Reçoit un identifiant pseudonyme propre à votre navigateur
            et des événements de navigation (ex. : étape de commande atteinte). Lorsqu&rsquo;un achat est confirmé,
            l&rsquo;identifiant de votre session de paiement Stripe est transmis à Google comme identifiant de
            transaction : ce n&rsquo;est pas un identifiant anonyme, il reste rattaché à votre commande dans nos
            systèmes et chez Stripe. Aucun nom, e-mail ou adresse postale n&rsquo;est en revanche jamais transmis à
            Google.
          </p>
        </section>

        <section className="section">
          <h2>5. Durée de conservation</h2>
          <p className="placeholder">
            Nous n&rsquo;avons pas encore formalisé de durée de conservation pour les données que nous conservons
            nous-mêmes (composition des commandes, e-mail et taille liés au suivi de fabrication) : [à compléter].
            Aucune suppression automatique n&rsquo;est actuellement en place : ces données restent enregistrées
            jusqu&rsquo;à suppression manuelle de notre part.
          </p>
          <p>
            Votre choix concernant les cookies est conservé sur votre appareil sans durée d&rsquo;expiration définie
            : il y reste jusqu&rsquo;à ce que vous l&rsquo;effaciez vous-même ou que vous le modifiiez via
            l&rsquo;onglet « COOKIES » décrit à l&rsquo;article 7.
          </p>
          <p className="placeholder">
            Les durées de conservation appliquées par Stripe, Printful, Resend et Google sur les données qu&rsquo;ils
            traitent pour leur propre compte sont définies par leurs politiques respectives : [liens à ajouter après
            vérification].
          </p>
        </section>

        <section className="section">
          <h2>6. Transferts de données hors Union européenne</h2>
          <p className="placeholder">
            Certains de nos prestataires (notamment Printful, Stripe et Google) sont susceptibles de traiter des
            données en dehors de l&rsquo;Union européenne, en particulier aux États-Unis. Les garanties mises en
            place par chacun d&rsquo;eux pour encadrer ces transferts (par exemple des clauses contractuelles types
            de la Commission européenne) seront précisées ici après vérification auprès de leurs documentations
            respectives : [à compléter]. La région d&rsquo;hébergement de notre base de données (Neon) sera
            également précisée ici après vérification : [à compléter].
          </p>
        </section>

        <section className="section">
          <h2>7. Cookies et consentement analytics</h2>
          <p>
            Nous ne déposons nous-mêmes aucun cookie : votre choix concernant les cookies de mesure d&rsquo;audience
            est enregistré uniquement dans le stockage local de votre navigateur (localStorage), pas dans un cookie.
          </p>
          <p>
            Tant que vous n&rsquo;avez pas cliqué sur « Accepter » dans le bandeau affiché en bas de l&rsquo;écran,
            aucun script de mesure d&rsquo;audience n&rsquo;est chargé et aucune donnée n&rsquo;est envoyée à Google.
            Si vous cliquez sur « Refuser », il en va de même : votre choix est simplement mémorisé.
          </p>
          <p>
            Si vous cliquez sur « Accepter », Google Analytics 4 se charge et dépose ses propres cookies (ex. :
            `_ga`) dans votre navigateur, dont la liste exacte et la durée sont définies par Google : [à compléter
            après vérification].
          </p>
          <p>
            Vous pouvez modifier votre choix à tout moment via le petit onglet « COOKIES » affiché en bas de
            l&rsquo;écran une fois un premier choix effectué.
          </p>
        </section>

        <section className="section">
          <h2>8. Vos droits</h2>
          <p>
            Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et
            Libertés, vous disposez des droits suivants sur les données vous concernant : droit d&rsquo;accès, de
            rectification, d&rsquo;effacement, de limitation du traitement, d&rsquo;opposition, de portabilité, ainsi
            que le droit de retirer à tout moment votre consentement au suivi analytics, sans que cela remette en
            cause la licéité d&rsquo;un traitement effectué avant ce retrait.
          </p>
          <p>
            Pour exercer l&rsquo;un de ces droits, contactez-nous à <a href="mailto:hello@monkebab.xyz">hello@monkebab.xyz</a>.
            Une preuve d&rsquo;identité pourra vous être demandée en cas de doute raisonnable sur votre identité.
          </p>
        </section>

        <section className="section">
          <h2>9. Sécurité des données</h2>
          <p>
            Les échanges avec notre site sont chiffrés (HTTPS). Le paiement est intégralement traité par Stripe,
            certifié PCI-DSS : nous n&rsquo;avons à aucun moment accès à votre numéro de carte bancaire. L&rsquo;accès
            à notre base de données et à nos outils internes est limité aux personnes qui en ont besoin pour
            assurer le fonctionnement du site.
          </p>
        </section>

        <section className="section">
          <h2>10. Réclamation auprès de la CNIL</h2>
          <p>
            Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire
            une réclamation auprès de la Commission nationale de l&rsquo;informatique et des libertés (CNIL) :{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
              www.cnil.fr
            </a>
            .
          </p>
        </section>

        <section className="section">
          <h2>11. Mise à jour de cette politique</h2>
          <p>
            Cette politique de confidentialité peut évoluer, notamment pour refléter un changement dans nos outils
            ou nos prestataires. La version en ligne sur cette page fait foi.
          </p>
          <p className="placeholder">Dernière mise à jour : 8 octobre 2026.</p>
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
