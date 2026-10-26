'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { Navbar } from './navbar';
import { InstagramIcon, TwitterIcon } from './primitives';
import type { Genre, Level } from '@/lib/schemas';

const HERO_VIDEO_URL = '/hero.mp4';
const FADE_MS = 500;
const FADE_OUT_LEAD_S = 0.55;
const RESTART_DELAY_MS = 100;

const SOCIAL_LINKS = [
  { label: 'Instagram', Icon: InstagramIcon, href: 'https://instagram.com' },
  { label: 'Twitter', Icon: TwitterIcon, href: 'https://twitter.com' },
];

const QUICK_PROMPTS = [
  { label: 'Sci-Fi Space Odyssey', query: 'Realistic hard sci-fi exploring space physics and first contact', genre: 'sci-fi' as Genre },
  { label: 'Dark Psychological Thriller', query: 'Fast-paced psychological thriller with unreliable narrator and shocking twist', genre: 'thriller' as Genre },
  { label: 'Slow-burn Romance', query: 'Enemies-to-lovers romance with witty banter and deep emotional tension', genre: 'romance' as Genre },
  { label: 'Mind-Bending Non-Fiction', query: 'Non-fiction books on consciousness, rationality, and human decision making', genre: 'non-fiction' as Genre },
];

const GENRE_OPTIONS: { value: Genre; label: string }[] = [
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'romance', label: 'Romance' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'horror', label: 'Horror' },
  { value: 'action/adventure', label: 'Action & Adventure' },
  { value: 'non-fiction', label: 'Non-Fiction' },
  { value: 'classics', label: 'Classics' },
  { value: 'motivational/self-help', label: 'Self-Help' },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

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
  const [inputMessage, setInputMessage] = React.useState('');
  const [selectedGenre, setSelectedGenre] = React.useState<Genre | undefined>(undefined);
  const [selectedLevel, setSelectedLevel] = React.useState<Level | undefined>(undefined);
  const [showFilters, setShowFilters] = React.useState(false);

  const play = (video: HTMLVideoElement) => {
    void video.play()?.catch(() => undefined);
  };

  const attachVideo = React.useCallback((video: HTMLVideoElement | null) => {
    if (video && video.readyState >= 3) setIsVisible(true);

    return () => {
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    };
  }, []);

  const navigateToChat = (query: string, genre?: Genre, level?: Level) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    if (level) params.set('level', level);
    router.push(`/chat?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    navigateToChat(inputMessage.trim(), selectedGenre, selectedLevel);
  };

  const handleQuickPrompt = (item: typeof QUICK_PROMPTS[0]) => {
    navigateToChat(item.query, item.genre, selectedLevel);
  };

  return (
    <section id="discover" className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Background ambient light and video */}
      <div
        aria-hidden
        className="glow-top absolute inset-0 pointer-events-none z-0"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-radial-gradient from-transparent via-background/60 to-background pointer-events-none z-0"
      />

      {videoFailed ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black opacity-80"
          style={posterSrc ? { backgroundImage: `url(${posterSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
      ) : (
        <motion.video
          ref={attachVideo}
          className="absolute inset-0 h-full w-full object-cover object-bottom opacity-40 mix-blend-luminosity"
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
          animate={{ opacity: isVisible ? 0.35 : 0 }}
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

      {/* Floating Navbar */}
      <Navbar userEmail={userEmail} onLogout={onLogout} />

      {/* Hero Centerpiece */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-10 md:py-16 text-center">
        {/* Subtle pill badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="liquid-glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-foreground/80"
        >
          <Sparkles size={13} className="text-primary" />
          <span>Deterministic AI Book Recommender & Reading Ladders</span>
        </motion.div>

        {/* Main Serif Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-6 max-w-4xl [font-family:var(--font-asme-serif)] text-5xl tracking-tight text-foreground sm:text-7xl md:text-8xl lg:text-9xl"
        >
          Read what makes you <em className="italic">think</em>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-8 max-w-2xl px-4 text-sm sm:text-base leading-relaxed text-foreground/70"
        >
          Describe any premise, mood, question, or niche curiosity. BookCompass pairs verifiable database metadata with deterministic reading ladders. Zero hallucinations.
        </motion.p>

        {/* Liquid-glass Search Input Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-2xl px-2"
        >
          <form
            onSubmit={handleSubmit}
            className="liquid-glass group relative flex flex-col rounded-3xl p-2 sm:p-2.5 transition-all focus-within:ring-1 focus-within:ring-foreground/20"
          >
            <div className="flex items-center gap-3 px-3 py-1.5 sm:py-2">
              <Search size={18} className="text-foreground/40 shrink-0" />
              <input
                id="bookcompass-hero-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything... e.g. 'thought-provoking sci-fi dealing with AI consciousness'"
                className="min-w-0 flex-1 bg-transparent text-sm sm:text-base text-foreground outline-none placeholder:text-foreground/40"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                aria-label="Find books"
                className="liquid-glass inline-flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer shadow-md"
              >
                <ArrowRight size={18} className="rtl:rotate-180" />
              </button>
            </div>

            {/* Optional Filter toggles row */}
            <div className="mt-2 flex flex-wrap items-center justify-between border-t border-foreground/10 px-3 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="text-foreground/60 hover:text-foreground font-medium transition-colors cursor-pointer"
                >
                  {showFilters ? '- Hide Options' : '+ Genre & Difficulty'}
                </button>
                {selectedGenre && (
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-foreground">
                    {selectedGenre}
                  </span>
                )}
                {selectedLevel && (
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-foreground capitalize">
                    {selectedLevel}
                  </span>
                )}
              </div>

              <span className="hidden sm:inline-block text-[11px] text-foreground/40 font-mono">
                Press Enter ↵ to launch chat
              </span>
            </div>

            {/* Expanded Genre / Level Selectors */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-3 px-3 pt-3 pb-2 text-left"
              >
                <div>
                  <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider block mb-1.5">
                    Genre Focus
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedGenre(undefined)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-all cursor-pointer ${
                        !selectedGenre ? 'bg-foreground text-background font-medium' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
                      }`}
                    >
                      Any
                    </button>
                    {GENRE_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setSelectedGenre(g.value === selectedGenre ? undefined : g.value)}
                        className={`rounded-full px-2.5 py-1 text-xs transition-all cursor-pointer ${
                          selectedGenre === g.value ? 'bg-foreground text-background font-medium' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider block mb-1.5">
                    Reading Depth / Level
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLevel(undefined)}
                      className={`rounded-full px-3 py-1 text-xs transition-all cursor-pointer ${
                        !selectedLevel ? 'bg-foreground text-background font-medium' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
                      }`}
                    >
                      Any Depth
                    </button>
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl.value}
                        type="button"
                        onClick={() => setSelectedLevel(lvl.value === selectedLevel ? undefined : lvl.value)}
                        className={`rounded-full px-3 py-1 text-xs transition-all cursor-pointer ${
                          selectedLevel === lvl.value ? 'bg-foreground text-background font-medium' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </form>

          {/* Quick Curated Prompts */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-foreground/40 mr-1">Trending:</span>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleQuickPrompt(p)}
                className="liquid-glass rounded-full px-3 py-1 text-xs font-medium text-foreground/80 transition-all hover:bg-foreground/10 hover:text-foreground cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer social icons inside hero */}
      <footer className="relative z-10 flex justify-center gap-3 pb-8">
        {SOCIAL_LINKS.map(({ label, Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="liquid-glass inline-flex size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:text-foreground"
          >
            <Icon className="size-4" />
          </a>
        ))}
      </footer>
    </section>
  );
};
