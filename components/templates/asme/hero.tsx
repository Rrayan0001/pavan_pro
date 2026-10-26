'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { Navbar } from './navbar';

interface HeroProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Hero = ({
  userEmail,
  onLogout,
}: HeroProps) => {
  const router = useRouter();
  const [email, setEmail] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      router.push('/login');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem('bookcompass_user_email', cleanEmail);
    window.dispatchEvent(new Event('bookcompass_auth_change'));
    router.push('/chat');
  };

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-black text-white">
      {/* Background Image: cosmic.png for instant, lightweight rendering without video decoder overhead */}
      <img
        src="/cosmic.png"
        alt="Cosmic Night Sky"
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />

      {/* Floating Pill Navbar */}
      <Navbar userEmail={userEmail} onLogout={onLogout} />

      {/* Hero Content - Cleanly positioned above the visual focal point */}
      <div className="relative z-10 flex flex-1 -translate-y-[15%] sm:-translate-y-[18%] flex-col items-center justify-center px-6 py-12 text-center">
        {/* Massive Serif Title - Fixed Pure White */}
        <h1 className="mb-10 [font-family:var(--font-asme-serif)] text-6xl tracking-tight text-white sm:whitespace-nowrap md:text-8xl lg:text-9xl">
          Know it <em className="italic">all</em>.
        </h1>

        {/* Liquid-Glass Pill Email / Launch Form */}
        <form
          onSubmit={handleSubmit}
          className="liquid-glass w-full max-w-xl rounded-full py-2 ps-6 pe-2 border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center">
            <input
              id="hero-email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to explore"
              className="min-w-0 flex-1 bg-transparent text-sm sm:text-base text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              aria-label="Continue"
              className="size-11 rounded-full bg-white text-black flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-md"
            >
              <ArrowRight className="size-5 rtl:rotate-180 text-black" />
            </button>
          </div>
        </form>

        {/* Narrative Tagline */}
        <p className="mt-6 max-w-md px-4 text-xs sm:text-sm leading-relaxed text-white/80">
          Discover grounded literature recommendations, verified authors, and progressive reading ladders. Zero hallucinations.
        </p>

        {/* Manifesto Action Pill */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('about');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="liquid-glass mt-8 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 cursor-pointer"
        >
          Manifesto
        </button>
      </div>
    </section>
  );
};
