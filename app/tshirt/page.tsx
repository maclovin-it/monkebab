'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function TshirtContent() {
  const searchParams = useSearchParams();

  const pain = searchParams.get('pain') || '';
  const viande = searchParams.get('viande') || '';
  const cruditesRaw = searchParams.get('crudites') || '';
  const saucesRaw = searchParams.get('sauces') || '';

  const crudites = cruditesRaw ? cruditesRaw.split(',') : [];
  const sauces = saucesRaw ? saucesRaw.split(',') : [];

  const [selectedSize, setSelectedSize] = useState('');
  const [showPaymentMsg, setShowPaymentMsg] = useState(false);

  const line1 = pain ? pain.toUpperCase() : 'SANS PAIN';
  const line2 = viande ? viande.toUpperCase() : 'SANS VIANDE';
  const line3 = crudites.length ? crudites.map((c) => c.toUpperCase()).join(', ') : 'SANS CRUDITÉS';
  const line4 = sauces.length ? sauces.map((s) => s.toUpperCase()).join(', ') : 'SANS SAUCE';

  const handleCommander = () => {
    // TODO: Stripe Checkout — créer une session de paiement avec la taille et les données kebab
    // TODO: Printful/Printify API — créer la variante produit avec la bonne taille
    // TODO: Générer le fichier print-ready (PNG/PDF 300dpi avec marges d'impression)
    // TODO: Créer automatiquement la commande de fulfillment après webhook Stripe payment_intent.succeeded
    setShowPaymentMsg(true);
  };

  return (
    <main className={`page ${anton.className}`}>
      <header className="topBar">
        <Link href="/" className="backLink">
          ← RETOUR
        </Link>
        <h1>TON T-SHIRT</h1>
        <div className="spacer" />
      </header>

      <div className="content">
        <div className="mockupWrapper">
          <div className="tshirtContainer">
            <svg className="tshirtSvg" viewBox="0 0 400 440" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 140 50 Q 200 20 260 50 L 350 85 L 390 180 L 318 200 L 318 420 L 82 420 L 82 200 L 10 180 L 50 85 Z"
                fill="#f0f0f0"
                stroke="#d0d0d0"
                strokeWidth="2"
              />
            </svg>
            <div className="chestText">
              <div className="textLine linePain">{line1}</div>
              <div className="textLine lineViande">{line2}</div>
              <div className="textLine lineCrudites">{line3}</div>
              <div className="textLine lineSauces">{line4}</div>
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="sizeSection">
            <div className="sizeLabel">TAILLE</div>
            <div className="sizeButtons">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`sizeBtn${selectedSize === size ? ' active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="commanderBtn" onClick={handleCommander}>
            COMMANDER
          </button>

          {showPaymentMsg && <div className="paymentMsg">Paiement bientôt disponible</div>}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-sizing: border-box;
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 36px;
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
          font-size: clamp(2rem, 5vw, 3.5rem);
          letter-spacing: 0.16em;
          text-align: center;
          flex: 1;
        }

        .spacer {
          min-width: 80px;
        }

        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }

        .mockupWrapper {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .tshirtContainer {
          position: relative;
          width: 100%;
          max-width: 320px;
        }

        .tshirtSvg {
          width: 100%;
          height: auto;
          display: block;
        }

        .chestText {
          position: absolute;
          top: 49%;
          left: 50%;
          transform: translateX(-50%);
          width: 54%;
          text-align: center;
          color: #111;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .textLine {
          line-height: 1.15;
          word-break: break-word;
          hyphens: none;
          text-align: center;
        }

        .linePain,
        .lineViande {
          font-size: 1.1rem;
        }

        .lineCrudites {
          font-size: 0.9rem;
        }

        .lineSauces {
          font-size: 0.75rem;
        }

        .controls {
          width: 100%;
          max-width: 320px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sizeSection {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sizeLabel {
          font-size: 0.78rem;
          letter-spacing: 0.18em;
          opacity: 0.6;
        }

        .sizeButtons {
          display: flex;
          gap: 8px;
        }

        .sizeBtn {
          flex: 1;
          height: 44px;
          border: 1px solid #666;
          background: #000;
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
          font-family: inherit;
        }

        .sizeBtn:hover {
          border-color: #999;
        }

        .sizeBtn.active {
          background: #fff;
          color: #000;
          border-color: #fff;
        }

        .commanderBtn {
          width: 100%;
          height: 56px;
          border: 1px solid #fff;
          background: #fff;
          color: #000;
          font-weight: 700;
          font-size: 0.92rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
          font-family: inherit;
        }

        .commanderBtn:hover {
          background: #e0e0e0;
        }

        .paymentMsg {
          text-align: center;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          opacity: 0.55;
          padding: 4px 0;
        }

        @media (max-width: 600px) {
          .page {
            padding: 16px 12px;
          }

          .topBar {
            margin-bottom: 24px;
          }

          .tshirtContainer {
            max-width: 280px;
          }

          .linePain,
          .lineViande {
            font-size: 0.95rem;
          }

          .lineCrudites {
            font-size: 0.78rem;
          }

          .lineSauces {
            font-size: 0.65rem;
          }
        }
      `}</style>
    </main>
  );
}

export default function TshirtPage() {
  return (
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      <TshirtContent />
    </Suspense>
  );
}
