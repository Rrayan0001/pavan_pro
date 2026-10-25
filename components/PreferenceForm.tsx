"use client";

import { useState } from "react";
import { GENRES, LEVELS, type Genre, type Level } from "@/lib/schemas";
import { LEVEL_RUBRIC } from "@/lib/scoring/rubric";
import { Send, Loader2, Info } from "lucide-react";

interface PreferenceFormProps {
  onSubmit: (data: {
    message: string;
    genre?: Genre;
    level?: Level;
  }) => void;
  isLoading: boolean;
  initialValues?: {
    message: string;
    genre?: Genre;
    level?: Level;
  } | null;
}

const GENRE_EMOJI: Record<string, string> = {
  romance: "💕",
  thriller: "🔪",
  horror: "👻",
  "action/adventure": "⚔️",
  mystery: "🔍",
  "sci-fi": "🚀",
  fantasy: "🧙",
  "motivational/self-help": "💪",
  "non-fiction": "📖",
  classics: "📚",
};

export function PreferenceForm({
  onSubmit,
  isLoading,
  initialValues,
}: PreferenceFormProps) {
  const [message, setMessage] = useState(initialValues?.message ?? "");
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>(
    initialValues?.genre
  );
  const [selectedLevel, setSelectedLevel] = useState<Level | undefined>(
    initialValues?.level
  );
  const [showLevelInfo, setShowLevelInfo] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedGenre) return;

    onSubmit({
      message: message.trim() || `Recommend me a ${selectedGenre ?? "good"} book`,
      genre: selectedGenre,
      level: selectedLevel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Genre chips */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-3">
          What genre are you in the mood for?
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() =>
                setSelectedGenre(selectedGenre === genre ? undefined : genre)
              }
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                border cursor-pointer
                ${
                  selectedGenre === genre
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                    : "bg-card text-card-foreground border-border hover:border-primary/50 hover:bg-muted"
                }
              `}
            >
              <span className="mr-1">{GENRE_EMOJI[genre] ?? "📖"}</span>
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Level selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm font-medium text-muted-foreground">
            Your reading level
          </label>
          <button
            type="button"
            onClick={() => setShowLevelInfo(!showLevelInfo)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Show level descriptions"
          >
            <Info size={14} />
          </button>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>

        {showLevelInfo && (
          <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
            {LEVELS.map((level) => (
              <div key={level}>
                <span className="font-medium capitalize">{level}:</span>{" "}
                <span className="text-muted-foreground">
                  {LEVEL_RUBRIC[level].description}.{" "}
                  {LEVEL_RUBRIC[level].traits.slice(0, 3).join(", ")}.
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() =>
                setSelectedLevel(selectedLevel === level ? undefined : level)
              }
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                border cursor-pointer
                ${
                  selectedLevel === level
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card text-card-foreground border-border hover:border-primary/50 hover:bg-muted"
                }
              `}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Free text input */}
      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell me what you're looking for... e.g., 'Something scary but I'm new to reading' or 'A deep sci-fi book like Dune'"
          className="w-full min-h-[80px] px-4 py-3 pr-12 rounded-xl border border-border bg-card
            text-card-foreground placeholder:text-muted-foreground resize-none
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-all duration-200"
          maxLength={500}
          rows={3}
        />
        <div className="absolute bottom-2 left-4 text-xs text-muted-foreground">
          {message.length}/500
        </div>
        <button
          type="submit"
          disabled={isLoading || (!message.trim() && !selectedGenre)}
          className="absolute bottom-2 right-2 p-2 rounded-lg bg-primary text-primary-foreground
            hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 cursor-pointer"
          aria-label="Get recommendations"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </form>
  );
}
