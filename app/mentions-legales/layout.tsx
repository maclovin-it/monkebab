import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — Mon Kebab',
};

export default function MentionsLegalesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
