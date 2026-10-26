'use client';

import * as React from 'react';
import { MotionConfig } from 'framer-motion';

import { cn } from '@/lib/utils';
import { About } from './about';
import { FeaturedVideo } from './featured-video';
import { inter, instrumentSerif } from './fonts';
import { Footer } from './footer';
import { Hero } from './hero';
import { Philosophy } from './philosophy';
import { Services } from './services';
import { AsmeStyles } from './styles';

interface AsmeLandingProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Asme = ({ userEmail, onLogout }: AsmeLandingProps) => {
  return (
    <MotionConfig reducedMotion="user">
      <main
        className={cn(
          'asme dark',
          inter.variable,
          instrumentSerif.variable,
          'relative min-h-svh bg-black [font-family:var(--font-asme-sans),ui-sans-serif,sans-serif] text-white antialiased',
        )}
      >
        <AsmeStyles />

        {/* Full Hero with Liquid-Glass search bar & pill navbar */}
        <Hero userEmail={userEmail} onLogout={onLogout} />

        {/* About Section */}
        <About />

        {/* Featured Video Showcase */}
        <FeaturedVideo />

        {/* Philosophy Section */}
        <Philosophy />

        {/* Engine Features / Services Grid */}
        <Services />

        {/* Massive Footer with BookCompass Watermark */}
        <Footer />
      </main>
    </MotionConfig>
  );
};

export default Asme;
