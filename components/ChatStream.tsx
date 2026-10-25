"use client";

import { motion } from "framer-motion";
import { Compass, Sparkles } from "lucide-react";

interface ChatStreamProps {
  content: string;
  isStreaming: boolean;
  error?: string | null;
}

export function ChatStream({ content, isStreaming, error }: ChatStreamProps) {
  if (error) {
    return (
      <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
        <p className="font-medium">Recommendation Error</p>
        <p className="mt-1 opacity-90">{error}</p>
      </div>
    );
  }

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Compass size={16} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              BookCompass AI Curator
            </h4>
            <p className="text-xs text-muted-foreground">
              Grounded exclusively in verified book catalog data
            </p>
          </div>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <Sparkles size={13} className="animate-spin text-primary" />
            <span>Curating explanations...</span>
          </div>
        )}
      </div>

      <div className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap font-normal">
        {content || (
          <div className="space-y-2 py-2">
            <div className="h-4 w-5/6 rounded skeleton" />
            <div className="h-4 w-full rounded skeleton" />
            <div className="h-4 w-3/4 rounded skeleton" />
          </div>
        )}
        {isStreaming && content && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
        )}
      </div>
    </motion.div>
  );
}
