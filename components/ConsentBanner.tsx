'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Anton } from 'next/font/google';
import { GA_MEASUREMENT_ID, setGaDisabled } from '@/lib/analytics/ga';
import { readStoredConsent, writeStoredConsent, type ConsentChoice } from '@/lib/analytics/consent';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

/**
 * Owns the whole analytics-consent lifecycle in one place:
 * - loads gtag.js only once consent is 'granted' (never before, never for
 *   a 'denied' or not-yet-decided visitor);
 * - shows the banner on first visit (no stored choice yet) and whenever
 *   reopened via the small "Cookies" control;
 * - lets the choice be changed later.
 *
 * trackEvent()/getGaClientId() (lib/analytics/ga.ts) need no consent logic
 * of their own — they already no-op safely whenever window.gtag doesn't
 * exist, which is exactly the case until this component decides to render
 * the script. setGaDisabled() additionally neutralizes gtag.js itself the
 * moment consent is denied/revoked, in case it was already loaded from an
 * earlier grant in this same page.
 */
// A single explicit state machine instead of juggling an
// undefined/null/ConsentChoice value alongside a separate boolean — every
// one of the 4 states below maps to exactly one on-screen outcome, with no
// room for the two pieces of state to disagree with each other:
//   loading -> nothing shown yet (avoids an SSR/client mismatch; resolved
//              by the mount effect below, before the first real render)
//   unset   -> no stored choice: banner open, COOKIES tab hidden
//   granted -> banner closed, COOKIES tab visible, gtag.js loads
//   denied  -> banner closed, COOKIES tab visible, gtag.js stays off
type UiState = 'loading' | 'unset' | ConsentChoice;

export default function ConsentBanner() {
  const [uiState, setUiState] = useState<UiState>('loading');
  // Separate from uiState on purpose: reopening the banner to change an
  // already-made choice must hide the COOKIES tab and show the banner
  // without touching the stored choice itself (still 'granted'/'denied'
  // until the visitor actually picks again).
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    const resolved: UiState = stored === 'granted' || stored === 'denied' ? stored : 'unset';
    setUiState(resolved);
    setGaDisabled(resolved !== 'granted');
  }, []);

  const choose = (choice: ConsentChoice) => {
    writeStoredConsent(choice);
    setUiState(choice);
    setReopened(false);
    setGaDisabled(choice !== 'granted');
  };

  const bannerOpen = uiState === 'unset' || reopened;
  const showCookiesTab = (uiState === 'granted' || uiState === 'denied') && !reopened;

  const scriptsEnabled =
    process.env.NODE_ENV === 'production' && Boolean(GA_MEASUREMENT_ID) && uiState === 'granted';

  return (
    <>
      {scriptsEnabled && (
        <>
          <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');`}
          </Script>
        </>
      )}

      {/* Small, persistent control to reopen the banner and change an
          already-made choice later — the project has no footer to anchor
          this to (checked), so it's a discreet fixed tab instead. Visible
          only once a real choice exists (granted/denied) and the banner
          isn't currently open (first visit, or manually reopened) — see
          the UiState machine above. Positioned clear of /tshirt's fixed
          mobile COMMANDER bar. */}
      {showCookiesTab && (
        <button
          type="button"
          className={`consentReopen ${anton.className}`}
          onClick={() => setReopened(true)}
        >
          COOKIES
        </button>
      )}

      {bannerOpen && (
        <div className={`consentBanner ${anton.className}`} role="dialog" aria-label="Préférences de cookies">
          <p className="consentText">
            On utilise des cookies de mesure d&rsquo;audience (Google Analytics) pour comprendre comment le site est
            utilisé. Rien n&rsquo;est activé sans ton accord.
          </p>
          <div className="consentActions">
            <button type="button" className="consentBtn consentRefuse" onClick={() => choose('denied')}>
              Refuser
            </button>
            <button type="button" className="consentBtn consentAccept" onClick={() => choose('granted')}>
              Accepter
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .consentBanner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 2000;
          background: #050505;
          border-top: 1px solid #666;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .consentText {
          margin: 0;
          color: #fff;
          font-family: inherit;
          font-size: 0.8rem;
          letter-spacing: 0.01em;
          line-height: 1.4;
          max-width: 640px;
          opacity: 0.85;
          text-transform: none;
        }

        .consentActions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .consentBtn {
          height: 38px;
          padding: 0 18px;
          font-family: inherit;
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .consentRefuse {
          background: #000;
          color: #fff;
          border: 1px solid #666;
        }

        .consentRefuse:hover {
          border-color: #999;
        }

        .consentAccept {
          background: #fff;
          color: #000;
          border: 1px solid #fff;
        }

        .consentAccept:hover {
          background: #e0e0e0;
        }

        .consentReopen {
          position: fixed;
          left: 12px;
          bottom: 16px;
          z-index: 1900;
          background: #050505;
          color: #fff;
          border: 1px solid #666;
          opacity: 0.55;
          padding: 6px 10px;
          font-family: inherit;
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .consentReopen:hover {
          opacity: 1;
        }

        @media (max-width: 600px) {
          .consentBanner {
            /* Clears /tshirt's fixed COMMANDER bar (height:60px, flush
               with the bottom edge on small screens) — on pages without
               that bar (e.g. the home page), this just leaves a small,
               harmless gap under the banner instead of touching the very
               edge. */
            bottom: 60px;
            padding: 12px 14px;
            gap: 12px;
          }

          .consentText {
            font-size: 0.74rem;
          }

          .consentBtn {
            height: 42px;
            padding: 0 14px;
            font-size: 0.8rem;
          }

          /* Clears /tshirt's fixed COMMANDER bar (60px tall, flush with
             the bottom edge on small screens). */
          .consentReopen {
            bottom: 72px;
          }
        }
      `}</style>
    </>
  );
}
