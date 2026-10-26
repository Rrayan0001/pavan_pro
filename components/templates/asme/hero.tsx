'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { Navbar } from './navbar';

const HERO_VIDEO_URL = '/hero.mp4';
const FADE_MS = 500;
const FADE_OUT_LEAD_S = 0.55;
const RESTART_DELAY_MS = 100;

interface HeroProps {
  videoSrc?: string;
  posterSrc?: string;
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Hero = ({
  videoSrc = HERO_VIDEO_URL,
  posterSrc,
  userEmail,
  onLogout,
}: HeroProps) => {
  const router = useRouter();
  const reduced = useReducedMotion();
  const restartTimerRef = React.useRef<number | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [email, setEmail] = React.useState('');

  const play = (video: HTMLVideoElement) => {
    void video.play()?.catch(() => undefined);
  };

  const attachVideo = React.useCallback((video: HTMLVideoElement | null) => {
    if (video && video.readyState >= 3) setIsVisible(true);

    return () => {
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    };
  }, []);

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
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Video Background (Full-Color, Natural Vibrancy - No B&W wash) */}
      {videoFailed ? (
        <div
          aria-hidden
          className="glow-top absolute inset-0 bg-cover bg-bottom"
          style={posterSrc ? { backgroundImage: `url(${posterSrc})` } : undefined}
        />
      ) : (
        <motion.video
          ref={attachVideo}
          className="absolute inset-0 h-full w-full object-cover object-bottom"
          src={videoSrc}
          poster={posterSrc}
          muted
          autoPlay
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
          loop={reduced ?? false}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : FADE_MS / 1000, ease: 'linear' }}
          onCanPlay={(event) => {
            if (isVisible) return;
            play(event.currentTarget);
            setIsVisible(true);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (reduced || !isVisible || !Number.isFinite(video.duration)) return;
            if (video.duration - video.currentTime <= FADE_OUT_LEAD_S) setIsVisible(false);
          }}
          onEnded={(event) => {
            const video = event.currentTarget;
            restartTimerRef.current = window.setTimeout(() => {
              video.currentTime = 0;
              play(video);
              setIsVisible(true);
            }, RESTART_DELAY_MS);
          }}
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* Floating Pill Navbar */}
      <Navbar userEmail={userEmail} onLogout={onLogout} />

      {/* Hero Content - Cleanly positioned above the visual focal point */}
      <div className="relative z-10 flex flex-1 -translate-y-[15%] sm:-translate-y-[18%] flex-col items-center justify-center px-6 py-12 text-center">
        {/* Massive Serif Title */}
        <h1 className="mb-10 [font-family:var(--font-asme-serif)] text-6xl tracking-tight text-foreground sm:whitespace-nowrap md:text-8xl lg:text-9xl">
          Know it <em className="italic">all</em>.
        </h1>

        {/* Liquid-Glass Pill Email / Launch Form */}
        <form
          onSubmit={handleSubmit}
          className="liquid-glass w-full max-w-xl rounded-full py-2 ps-6 pe-2"
        >
          <div className="flex items-center">
            <input
              id="hero-email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to explore"
              className="min-w-0 flex-1 bg-transparent text-sm sm:text-base text-foreground outline-none placeholder:text-foreground/40"
            />
            <button
              type="submit"
              aria-label="Continue"
              className="size-11 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-md"
            >
              <ArrowRight className="size-5 rtl:rotate-180" />
            </button>
          </div>
        </form>

        {/* Narrative Tagline */}
        <p className="mt-6 max-w-md px-4 text-xs sm:text-sm leading-relaxed text-foreground/80">
          Discover grounded literature recommendations, verified authors, and progressive reading ladders. Zero hallucinations.
        </p>

        {/* Manifesto Action Pill */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('about');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="liquid-glass mt-8 rounded-full px-8 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 cursor-pointer"
        >
          Manifesto
        </button>
      </div>
    </section>
  );
};
