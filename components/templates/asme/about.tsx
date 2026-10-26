'use client';

import { motion } from 'framer-motion';

import { reveal, Serif } from './primitives';

export const About = () => {
  return (
    <section id="about" className="relative overflow-hidden bg-black text-white px-6 pt-32 pb-10 md:pt-44 md:pb-14">
      <div aria-hidden className="glow-top absolute inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-5xl text-center">
        <motion.p
          {...reveal({ y: 20, duration: 0.6 })}
          className="mb-8 text-sm tracking-widest text-white/50 uppercase font-mono"
        >
          About BookCompass
        </motion.p>

        <motion.h2
          {...reveal({ y: 40, duration: 0.8, delay: 0.1 })}
          className="text-4xl leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          Pioneering <Serif className="text-white/70">curation</Serif> for <br className="hidden md:block" />
          minds that <Serif className="text-white/70">read, question, and explore.</Serif>
        </motion.h2>
      </div>
    </section>
  );
};
