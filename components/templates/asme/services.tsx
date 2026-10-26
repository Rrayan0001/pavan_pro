'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

import { reveal } from './primitives';

const SERVICES = [
  {
    tag: 'Intelligence & Verification',
    title: 'Hybrid Retrieval & Grounded Metadata',
    videoUrl: '/services-research.mp4',
    points: [
      {
        heading: 'Hybrid Semantic Search',
        body: 'Combines vector embeddings with pgvector cosine similarity and keyword indexing to locate books matching your exact tone and nuance.',
      },
      {
        heading: 'Zero-Hallucination Grounding',
        body: 'Live validation against verified records guarantees legitimate authors, real ISBNs, page counts, and authentic cover artwork.',
      },
    ],
  },
  {
    tag: 'Progression & Continuity',
    title: 'Reading Ladders & Conversational Memory',
    videoUrl: '/services-design.mp4',
    points: [
      {
        heading: '3-Step Progressive Pathways',
        body: 'Move beyond single suggestions with curated ladders: foundational introductions, intermediate deep-dives, and masterwork capstones.',
      },
      {
        heading: 'Multi-Turn Context & Cloud Sync',
        body: 'Converse fluidly across turns. Refine genres, adjust difficulty, ask follow-up questions, and sync saved chats across devices.',
      },
    ],
  },
];

interface ServiceVideoProps {
  src: string;
  posterSrc?: string;
}

const ServiceCardMedia = ({ src, posterSrc }: ServiceVideoProps) => {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div
        aria-hidden
        className="glow-center h-full w-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-6"
      />
    );
  }

  return (
    <video
      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      src={src}
      poster={posterSrc}
      muted
      autoPlay
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      onError={() => setFailed(true)}
    />
  );
};

export const Services = () => {
  return (
    <section id="features" className="relative overflow-hidden bg-black text-white px-6 py-28 md:py-40">
      <div aria-hidden className="glow-center absolute inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div {...reveal({ y: 30, duration: 0.7 })} className="mb-12 flex items-end justify-between md:mb-16">
          <h2 className="text-3xl tracking-tight text-white md:text-5xl">Engine Architecture</h2>
          <p className="hidden text-sm text-white/50 md:block font-mono uppercase tracking-wider">Two Core Pillars</p>
        </motion.div>

        {/* 2 Side-by-Side Cards (No duplicates, 2 points per card) */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {SERVICES.map((service, index) => (
            <motion.article
              key={service.tag}
              {...reveal({ y: 50, duration: 0.8, delay: index * 0.15 })}
              className="liquid-glass group overflow-hidden rounded-3xl border border-white/15 bg-black/50 transition-colors hover:border-white/30 flex flex-col justify-between shadow-2xl"
            >
              <div className="relative aspect-video overflow-hidden bg-zinc-950">
                <ServiceCardMedia src={service.videoUrl} />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              </div>

              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-widest text-white/50 uppercase font-mono">
                      {service.tag}
                    </p>
                    <span aria-hidden className="liquid-glass rounded-full p-2 text-white/80 group-hover:text-white border border-white/15 bg-white/5">
                      <ArrowUpRight
                        size={18}
                        className="rtl:-scale-x-100 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </span>
                  </div>

                  <h3 className="mb-6 text-xl font-medium tracking-tight text-white md:text-2xl">
                    {service.title}
                  </h3>

                  <div className="space-y-4">
                    {service.points.map((pt) => (
                      <div key={pt.heading} className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                          <CheckCircle2 size={15} className="text-white/70 shrink-0" />
                          <span>{pt.heading}</span>
                        </div>
                        <p className="pl-6 text-xs sm:text-sm leading-relaxed text-white/60">
                          {pt.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
