const ASME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');

:root, .asme {
  --font-asme-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-asme-serif: 'Instrument Serif', 'Times New Roman', Georgia, serif;
}

/* Fixed Dark Aesthetic for Landing Page & Login Page — immune to chatbot light/dark mode */
.asme, .asme.dark, .asme.light, .dark .asme, .light .asme {
  --color-background: #000000 !important;
  --color-foreground: #ffffff !important;
  --color-card: #0a0a0a !important;
  --color-card-foreground: #ffffff !important;
  --color-primary: #ffffff !important;
  --color-primary-foreground: #000000 !important;
  --color-secondary: #171717 !important;
  --color-secondary-foreground: #e5e5e5 !important;
  --color-muted: #171717 !important;
  --color-muted-foreground: #a3a3a3 !important;
  --color-accent: #171717 !important;
  --color-accent-foreground: #ffffff !important;
  --color-border: rgba(255, 255, 255, 0.15) !important;
  --color-input: rgba(255, 255, 255, 0.12) !important;
  --color-ring: rgba(255, 255, 255, 0.4) !important;
  --background: hsl(0 0% 0%) !important;
  --foreground: hsl(0 0% 100%) !important;
  --card: hsl(0 0% 5%) !important;
  --card-foreground: hsl(0 0% 100%) !important;
  --primary: hsl(0 0% 100%) !important;
  --primary-foreground: hsl(0 0% 0%) !important;
  --secondary: hsl(0 0% 12%) !important;
  --secondary-foreground: hsl(0 0% 85%) !important;
  --muted: hsl(0 0% 15%) !important;
  --muted-foreground: hsl(0 0% 65%) !important;
  --accent: hsl(0 0% 12%) !important;
  --accent-foreground: hsl(0 0% 100%) !important;
  --border: hsl(0 0% 20%) !important;
  --input: hsl(0 0% 18%) !important;
  --ring: hsl(0 0% 40%) !important;
  background-color: #000000 !important;
  color: #ffffff !important;
}

.asme ::selection {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.asme .liquid-glass {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 8px 32px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.asme .liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.15) 20%,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.15) 80%,
    rgba(255, 255, 255, 0.45) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.asme .glow-top {
  background: radial-gradient(ellipse at top, rgba(255, 255, 255, 0.07) 0%, transparent 70%);
}

.asme .glow-center {
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
}
`;

export const AsmeStyles = () => {
  return <style dangerouslySetInnerHTML={{ __html: ASME_CSS }} />;
};
