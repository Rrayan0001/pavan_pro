"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import type { LadderStep } from "@/lib/schemas";

interface ReadingLadderProps {
  steps: LadderStep[];
}

export function ReadingLadder({ steps }: ReadingLadderProps) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        Reading Ladder — Your progression path
      </h3>

      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.step} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.15 }}
              className="flex-shrink-0 w-48 p-3 rounded-xl border border-border bg-card
                hover:border-primary/30 hover:shadow-md transition-all duration-300"
            >
              {/* Step number */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 rounded-full bg-primary text-primary-foreground
                    text-xs font-bold flex items-center justify-center"
                >
                  {step.step}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {step.note ?? `Step ${step.step}`}
                </span>
              </div>

              {/* Book info */}
              <div className="flex gap-2">
                {step.book.coverUrl ? (
                  <img
                    src={step.book.coverUrl}
                    alt={step.book.title}
                    className="w-10 h-14 rounded object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-2 leading-tight">
                    {step.book.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.book.author}
                  </p>
                  {step.book.pageCount && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.book.pageCount}p
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Arrow between steps */}
            {i < steps.length - 1 && (
              <ArrowRight
                size={20}
                className="mx-2 text-muted-foreground flex-shrink-0"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
