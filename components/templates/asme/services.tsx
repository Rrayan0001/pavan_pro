'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Database, Search, MessageSquare, BookmarkCheck } from 'lucide-react';

import { reveal } from './primitives';

const SERVICES = [
  {
    tag: 'Intelligence',
    title: 'Hybrid Semantic Retrieval',
    description:
      'Combines vector embeddings with pgvector cosine distance and deterministic keyword indexing to discover exact matches.',
    icon: Search,
    videoUrl: '/media/templates/asme/services-research.mp4',
  },
  {
    tag: 'Verification',
    title: 'Grounded Book Metadata',
    description:
      'Live validation cross-referenced with Google Books API ensures real authors, legitimate ISBNs, and authentic cover artwork.',
    icon: Database,
    videoUrl: '/media/templates/asme/services-design.mp4',
  },
  {
    tag: 'Continuity',
    title: 'Multi-Turn Chat History',
    description:
      'Converse naturally across turns. Refine suggestions, ask follow-up questions, change reading levels, and save past threads.',
    icon: MessageSquare,
    videoUrl: '/media/templates/asme/services-chat.mp4',
  },
  {
    tag: 'Ladders',
    title: 'Progressive Pathways',
    description:
      'Explore ordered 3-stage reading journeys from accessible entrypoints to comprehensive masterclass literature.',
    icon: BookmarkCheck,
    videoUrl: '/media/templates/asme/services-ladder.mp4',
  },
];

interface ServiceVideoProps {
  src: string;
  posterSrc?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ServiceCardMedia = ({ src, posterSrc, Icon }: ServiceVideoProps) => {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div
        aria-hidden
        className="glow-center h-full w-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-6"
      >
        <Icon size={48} className="text-foreground/20 transition-transform duration-500 group-hover:scale-110" />
      </div>
    );
  }

  return (
    <video
      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60"
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
    <section id="features" className="relative overflow-hidden bg-background px-6 py-28 md:py-40">
      <div aria-hidden className="glow-center absolute inset-0" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div {...reveal({ y: 30, duration: 0.7 })} className="mb-12 flex items-end justify-between md:mb-16">
          <h2 className="text-3xl tracking-tight text-foreground md:text-5xl">Engine Architecture</h2>
          <p className="hidden text-sm text-foreground/40 md:block font-mono uppercase tracking-wider">Features & Specs</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {SERVICES.map((service, index) => (
            <motion.article
              key={service.tag}
              {...reveal({ y: 50, duration: 0.8, delay: index * 0.1 })}
              className="liquid-glass group overflow-hidden rounded-3xl border border-foreground/10 bg-card/40 transition-colors hover:border-foreground/25"
            >
              <div className="relative aspect-video overflow-hidden bg-zinc-950">
                <ServiceCardMedia src={service.videoUrl} Icon={service.icon} />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-widest text-foreground/50 uppercase font-mono">{service.tag}</p>
                  <span aria-hidden className="liquid-glass rounded-full p-2 text-foreground/80 group-hover:text-foreground">
                    <ArrowUpRight size={18} className="rtl:-scale-x-100 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-medium tracking-tight text-foreground md:text-2xl">{service.title}</h3>
                <p className="text-sm leading-relaxed text-foreground/60">{service.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
