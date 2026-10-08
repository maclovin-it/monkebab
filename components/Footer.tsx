'use client';

import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

/**
 * A single, discreet link group — "Contact" + the three legal pages —
 * mounted once in app/layout.tsx so it's present on every public page
 * without touching any page's own JSX.
 *
 * Deliberately a small fixed corner tab, not a traditional in-flow footer
 * bar: the home page (app/page.tsx) uses a fixed-height CSS grid
 * (height:100vh, grid-template-rows: auto minmax(0,1fr)) with no spare
 * vertical space for extra flow content on desktop, and inserting a real
 * footer there risks breaking that kiosk layout. This mirrors the same
 * fixed-corner-tab pattern already used and verified for the consent
 * banner's "COOKIES" reopen control (components/ConsentBanner.tsx) —
 * opposite corner, lower z-index, same mobile bottom offset to clear
 * /tshirt's fixed COMMANDER bar.
 *
 * Wraps onto a second line (flex-wrap + a width cap) rather than running
 * off the left edge of the screen now that there are 4 links instead of 1 —
 * verified at 375px and 414px widths.
 */
const LEGAL_LINKS: Array<{ href: string; label: string }> = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgv', label: 'CGV' },
  { href: '/politique-de-confidentialite', label: 'Confidentialité' },
];

export default function Footer() {
  return (
    <>
      <div className={`siteFooter ${anton.className}`}>
        <a href="mailto:hello@monkebab.xyz" className="siteFooterLink">
          Contact
        </a>
        {LEGAL_LINKS.map((link) => (
          <span key={link.href} className="siteFooterItem">
            <span className="siteFooterSep" aria-hidden="true">
              ·
            </span>
            <Link href={link.href} className="siteFooterLink">
              {link.label}
            </Link>
          </span>
        ))}
      </div>

      <style jsx>{`
        .siteFooter {
          position: fixed;
          right: 12px;
          bottom: 16px;
          z-index: 1800;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          max-width: calc(100vw - 24px);
        }

        .siteFooterItem {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .siteFooterLink {
          color: #fff;
          opacity: 0.5;
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity 0.2s ease;
        }

        .siteFooterLink:hover {
          opacity: 0.9;
        }

        .siteFooterSep {
          color: #fff;
          opacity: 0.3;
          font-size: 0.68rem;
        }

        @media (max-width: 600px) {
          .siteFooter {
            /* Clears /tshirt's fixed COMMANDER bar (height:60px, flush
               with the bottom edge on small screens). */
            bottom: 72px;
          }
        }
      `}</style>
    </>
  );
}
