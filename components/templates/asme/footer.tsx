'use client';

import { Compass } from 'lucide-react';
import { Serif, GithubIcon } from './primitives';

const FOOTER_COLUMNS = [
  {
    heading: 'Discovery',
    links: [
      { label: 'AI Recommender', href: '/chat' },
      { label: 'Reading Ladders', href: '#features' },
      { label: 'Methodology', href: '#methodology' },
      { label: 'About Compass', href: '#about' },
    ],
  },
  {
    heading: 'Technology',
    links: [
      { label: 'Deterministic Rubric', href: '#methodology' },
      { label: 'Supabase pgvector', href: 'https://supabase.com' },
      { label: 'Google Gemini', href: 'https://ai.google.dev' },
      { label: 'Next.js App Router', href: 'https://nextjs.org' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'GitHub Repository', href: 'https://github.com/Vijju-15/BookCompass' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: 'GitHub', Icon: GithubIcon, href: 'https://github.com/Vijju-15/BookCompass' },
];

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 bg-background px-6 pt-20 pb-12 md:pt-28">
      <div aria-hidden className="glow-top absolute inset-0" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="max-w-sm">
            <a href="#" aria-label="BookCompass home" className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-foreground/10 text-foreground">
                <Compass size={18} />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">BookCompass</span>
            </a>
            <p className="mt-5 text-sm leading-relaxed text-foreground/60">
              Read with <Serif className="text-foreground/80">direction</Serif>. Verified author metadata,
              deterministic match scores, and custom progressive reading ladders.
            </p>
            <div className="mt-7 flex gap-3">
              {SOCIAL_LINKS.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="liquid-glass rounded-full p-3 text-foreground/80 transition-all hover:bg-foreground/10 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <p className="mb-4 text-xs font-semibold tracking-widest text-foreground/40 uppercase font-mono">
                  {column.heading}
                </p>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Massive Serif Watermark as in Asme template */}
        <p
          aria-hidden
          className="mt-16 text-center [font-family:var(--font-asme-serif)] text-[18vw] leading-none tracking-tight text-foreground/5 select-none md:mt-20 md:text-[13vw]"
        >
          BookCompass
        </p>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-foreground/10 pt-8 sm:flex-row">
          <p className="text-xs text-foreground/40">&copy; 2026 BookCompass. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-foreground/40">Grounded Book Recommender</span>
            <span className="text-xs text-foreground/40">Zero Hallucinations</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
