'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen } from 'lucide-react';

import { reveal } from './primitives';

const FEATURED_VIDEO_URL = '/featured.mp4';

export const FeaturedVideo = () => {
  const [videoFailed, setVideoFailed] = React.useState(false);

  const scrollToDiscover = () => {
    const el = document.getElementById('discover');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const input = document.getElementById('bookcompass-hero-input');
      input?.focus();
    }
  };

  return (
    <section id="methodology" className="overflow-hidden bg-background px-6 pt-6 pb-20 md:pt-10 md:pb-32">
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal({ y: 60, duration: 0.9 })} className="relative aspect-video overflow-hidden rounded-3xl border border-foreground/10 bg-zinc-950">
          {!videoFailed ? (
            <video
              className="h-full w-full object-cover opacity-60"
              src={FEATURED_VIDEO_URL}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              aria-hidden
              tabIndex={-1}
              onError={() => setVideoFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
              <div className="text-center opacity-30">
                <BookOpen size={96} className="mx-auto mb-4 text-foreground/40" />
                <span className="font-mono text-sm tracking-widest uppercase">Verified Grounded Engine</span>
              </div>
            </div>
          )}

          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent"
          />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-10">
            <div className="liquid-glass max-w-lg rounded-2xl p-6 md:p-8">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-xs font-semibold tracking-widest text-foreground/70 uppercase">Our Approach</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
                We reject speculative hallucinations. Every recommendation is scored deterministically across tone,
                depth, pacing, and premise, enriched with real ISBNs, verified covers, and custom reading ladders.
              </p>
            </div>

            <motion.button
              type="button"
              onClick={scrollToDiscover}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="liquid-glass shrink-0 self-start rounded-full px-8 py-3 text-sm font-medium text-foreground transition-all hover:bg-foreground/10 md:self-auto cursor-pointer"
            >
              Start Discovering
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
