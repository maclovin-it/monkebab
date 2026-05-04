'use client';

import { Suspense, useState } from 'react';
import { generateDesignImage } from '@/lib/generate-design';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const line1 = pain ? pain.toUpperCase() : 'SANS PAIN';
  const line2 = viande ? viande.toUpperCase() : 'SANS VIANDE';
  const line3 = crudites.length ? crudites.map((c) => c.toUpperCase()).join(', ') : 'SANS CRUDITÉS';
  const line4 = sauces.length ? sauces.map((s) => s.toUpperCase()).join(', ') : 'SANS SAUCE';

  const handleCommander = async () => {
    setError('');
    if (!selectedSize) {
      setError('Choisis une taille avant de commander.');
      return;
    }
    setLoading(true);
    try {
      // Convert canvas blob to base64 data URI for Cloudinary upload
      const blob = await generateDesignImage(pain, viande, crudites, sauces);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const uploadRes = await fetch('/api/upload-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success || !uploadData.url) {
        setError(uploadData.error || 'Erreur lors de la génération de l\'image.');
        setLoading(false);
        return;
      }

      const printFileUrl = uploadData.url;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: selectedSize,
          bread: pain,
          meat: viande,
          vegetables: crudites,
          sauces,
          printFileUrl,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Une erreur est survenue.');
        setLoading(false);
      }
    } catch {
      setError('Impossible de contacter le serveur.');
      setLoading(false);
    }
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
          {/* Cadre carré blanc autour du t-shirt */}
          <div className="tshirtFrame">
            <div className="tshirtContainer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tshirt-base.png" alt="T-shirt mockup" className="tshirtImg" />
              <div className="chestText">
                <div className="textLine linePain">{line1}</div>
                <div className="textLine lineViande">{line2}</div>
                <div className="textLine lineCrudites">{line3}</div>
                <div className="textLine lineSauces">{line4}</div>
              </div>
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

          <button type="button" className="commanderBtn" onClick={handleCommander} disabled={loading}>
            {loading ? '...' : 'COMMANDER — 29,99€'}
          </button>

          <div className="orderInfo">
            <span className="orderInfoMain">Livraison incluse</span>
            <span className="orderInfoSub">Impression premium · Créé à la demande</span>
            <span className="orderInfoSub">Chaque t-shirt est imprimé spécialement pour toi.</span>
          </div>

          {error && <div className="paymentMsg errorMsg">{error}</div>}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          display: flex;
          flex-direction: column;
          padding: 20px 24px 24px;
          box-sizing: border-box;
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
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
          gap: 20px;
        }

        .mockupWrapper {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* Cadre blanc carré autour du mockup */
        .tshirtFrame {
          background: #fff;
          padding: 16px;
          width: 100%;
          max-width: 320px;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .tshirtContainer {
          position: relative;
          width: 100%;
        }

        .tshirtImg {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Texte positionné sur la poitrine du t-shirt noir */
        .chestText {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translateX(-50%);
          width: 45%;
          text-align: center;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .textLine {
          line-height: 1.15;
          word-break: break-word;
          hyphens: none;
          text-align: center;
        }

        .linePain,
        .lineViande {
          font-size: 1.2rem;
        }

        .lineCrudites {
          font-size: 0.98rem;
        }

        .lineSauces {
          font-size: 0.82rem;
        }

        .controls {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 12px;
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

        .errorMsg {
          opacity: 1;
          color: #ff6b6b;
        }

        .commanderBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .orderInfo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 2px 0;
        }

        .orderInfoMain {
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          opacity: 0.75;
        }

        .orderInfoSub {
          font-size: 0.72rem;
          letter-spacing: 0.05em;
          opacity: 0.45;
        }

        /* ── Desktop: side-by-side layout ── */
        @media (min-width: 601px) {
          .content {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 48px;
          }

          .mockupWrapper {
            flex: 1;
            max-width: 380px;
          }

          .tshirtFrame {
            max-width: 100%;
          }

          .controls {
            flex: 1;
            max-width: 360px;
          }
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .page {
            padding: 14px 12px 88px; /* bottom space for sticky button */
          }

          .topBar {
            margin-bottom: 12px;
          }

          .tshirtFrame {
            max-width: 280px;
          }

          .controls {
            max-width: 100%;
          }

          /* Sticky CTA on mobile */
          .commanderBtn {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            border-left: none;
            border-right: none;
            border-bottom: none;
            height: 60px;
            font-size: 1rem;
          }

          .linePain,
          .lineViande {
            font-size: 0.9rem;
          }

          .lineCrudites {
            font-size: 0.75rem;
          }

          .lineSauces {
            font-size: 0.62rem;
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
