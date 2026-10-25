"use client";

import { Sparkles } from "lucide-react";
import type { Genre, Level } from "@/lib/schemas";

export interface ExampleQuery {
  label: string;
  message: string;
  genre?: Genre;
  level?: Level;
}

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    label: "Short horror for a first-time reader",
    message: "Short spooky horror book with quick pacing, I'm new to reading fiction",
    genre: "horror",
    level: "beginner",
  },
  {
    label: "Mind-bending sci-fi like Interstellar",
    message: "Mind-bending science fiction about space, time, or first contact with high scientific concepts",
    genre: "sci-fi",
    level: "intermediate",
  },
  {
    label: "Cozy mystery to unwind with",
    message: "Lighthearted cozy whodunit mystery that is charming and humorous, easy to follow",
    genre: "mystery",
    level: "beginner",
  },
  {
    label: "Complex epic fantasy with deep lore",
    message: "Intricate high fantasy with immersive worldbuilding and complex political intrigue",
    genre: "fantasy",
    level: "advanced",
  },
  {
    label: "Fast-paced thriller with huge twists",
    message: "Psychological thriller with an unreliable narrator and sharp twists that keep me guessing",
    genre: "thriller",
    level: "intermediate",
  },
  {
    label: "Practical self-help on habit building",
    message: "Actionable, no-nonsense self-help book on discipline and building daily habits",
    genre: "motivational/self-help",
    level: "beginner",
  },
];

interface ExampleChipsProps {
  onSelectExample: (example: ExampleQuery) => void;
  disabled?: boolean;
}

export function ExampleChips({ onSelectExample, disabled }: ExampleChipsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles size={14} className="text-primary" />
        <span>Try an example prompt</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelectExample(example)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card/60
              text-card-foreground hover:bg-muted hover:border-primary/40 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed text-left cursor-pointer"
          >
            &ldquo;{example.label}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}
