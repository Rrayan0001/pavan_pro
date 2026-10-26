'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

import { reveal, Serif } from './primitives';

const PHILOSOPHY_VIDEO_URL = '/media/templates/asme/philosophy.mp4';

const TEXT_BLOCKS = [
  {
    label: 'Deterministic Match Rubric',
    body: 'Instead of unpredictable generative guesses, BookCompass computes multi-factor match scores based on premise fidelity, tonal resonance, pacing, and vocabulary level—calibrated against verified book records.',
  },
  {
    label: 'Progressive Reading Ladders',
    body: 'Every curated pathway constructs an ordered 3-tier sequence: foundational accessible introductions, comprehensive intermediate deep-dives, and transformative masterclass texts that expand your intellectual horizon.',
  },
];

export const Philosophy = () => {
  const [videoFailed, setVideoFailed] = React.useState(false);

  return (
    <section id="ladder" className="overflow-hidden bg-background px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          {...reveal({ y: 40, duration: 0.8 })}
          className="mb-16 text-5xl tracking-tight text-foreground md:mb-24 md:text-7xl lg:text-8xl"
        >
          Curated Depth <Serif className="text-foreground/40">x</Serif> Grounded AI
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 items-center">
          <motion.div
            {...reveal({ x: -40, duration: 0.8, delay: 0.1 })}
            className="aspect-[4/3] overflow-hidden rounded-3xl border border-foreground/10 bg-zinc-950 relative"
          >
            {!videoFailed ? (
              <video
                className="h-full w-full object-cover opacity-70"
                src={PHILOSOPHY_VIDEO_URL}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950">
                <Layers size={54} className="mb-4 text-foreground/30" />
                <span className="font-mono text-xs tracking-widest uppercase text-foreground/60 mb-2">
                  3-Step Stepping Stones
                </span>
                <p className="text-xs text-foreground/40 max-w-xs">
                  Beginner Foundation &rarr; Intermediate Mastery &rarr; Advanced Synthesis
                </p>
              </div>
            )}
          </motion.div>

          <motion.div {...reveal({ x: 40, duration: 0.8, delay: 0.2 })} className="flex flex-col justify-center">
            {TEXT_BLOCKS.map((block, index) => (
              <React.Fragment key={block.label}>
                {index > 0 ? <div aria-hidden className="my-10 h-px w-full bg-foreground/10" /> : null}
                <div>
                  <p className="mb-4 text-xs font-semibold tracking-widest text-foreground/40 uppercase font-mono">
                    {block.label}
                  </p>
                  <p className="text-base leading-relaxed text-foreground/80 md:text-lg">{block.body}</p>
                </div>
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
