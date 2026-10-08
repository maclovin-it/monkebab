import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales de vente — Mon Kebab',
};

export default function CgvLayout({ children }: { children: React.ReactNode }) {
  return children;
}
