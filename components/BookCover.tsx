"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

interface BookCoverProps {
  coverUrl?: string | null;
  title: string;
  author: string;
  genre?: string;
  size?: "sm" | "md";
  className?: string;
}

// Genre-aware gradients for stylized fallback covers
const GENRE_GRADIENTS: Record<string, string> = {
  romance: "from-rose-500 via-pink-600 to-amber-600",
  thriller: "from-slate-800 via-zinc-900 to-red-950",
  horror: "from-zinc-900 via-neutral-950 to-red-950",
  "action/adventure": "from-amber-600 via-orange-600 to-red-700",
  mystery: "from-indigo-900 via-slate-900 to-blue-950",
  "sci-fi": "from-cyan-700 via-blue-900 to-indigo-950",
  fantasy: "from-purple-700 via-violet-900 to-indigo-950",
  "motivational/self-help": "from-emerald-600 via-teal-700 to-cyan-900",
  "non-fiction": "from-blue-700 via-slate-800 to-zinc-900",
  classics: "from-amber-700 via-yellow-800 to-stone-900",
};

function normalizeCoverUrl(url?: string | null): string | null {
  if (!url) return null;
  let normalized = url.trim();
  // Force HTTPS to prevent mixed-content blocking
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }
  // Ensure Google Books thumbnails request higher quality & HTTPS
  if (normalized.includes("books.google.com")) {
    normalized = normalized.replace("&edge=curl", "");
  }
  return normalized;
}

export function BookCover({
  coverUrl,
  title,
  author,
  genre = "fiction",
  size = "md",
  className = "",
}: BookCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cleanUrl = normalizeCoverUrl(coverUrl);
  const gradient =
    GENRE_GRADIENTS[genre.toLowerCase()] ||
    "from-purple-800 via-indigo-900 to-slate-950";

  const isSmall = size === "sm";

  // Fallback stylized book cover
  if (!cleanUrl || imageFailed) {
    return (
      <div
        className={`
          flex-shrink-0 rounded-lg overflow-hidden relative shadow-md select-none
          bg-gradient-to-br ${gradient} text-white flex flex-col justify-between p-2
          border-l-4 border-l-white/20 border border-white/10
          ${isSmall ? "w-10 h-14 p-1" : "w-24 h-36 p-2.5"}
          ${className}
        `}
        title={`${title} by ${author}`}
      >
        <div className="flex items-center justify-between opacity-80">
          <BookOpen size={isSmall ? 10 : 14} className="opacity-70" />
          {!isSmall && (
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60 truncate max-w-[50px]">
              {genre}
            </span>
          )}
        </div>

        <div className="my-auto">
          <p
            className={`font-serif font-bold leading-tight line-clamp-3 text-white drop-shadow-xs ${
              isSmall ? "text-[8px] leading-2" : "text-[11px] leading-snug"
            }`}
          >
            {title}
          </p>
        </div>

        <p
          className={`truncate font-sans opacity-75 ${
            isSmall ? "text-[6px]" : "text-[9px]"
          }`}
        >
          {author}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`
        flex-shrink-0 rounded-lg overflow-hidden bg-muted relative shadow-sm
        ${isSmall ? "w-10 h-14" : "w-24 h-36"}
        ${className}
      `}
    >
      {/* Skeleton while loading */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <BookOpen size={isSmall ? 12 : 20} className="text-muted-foreground/30" />
        </div>
      )}

      <img
        src={cleanUrl}
        alt={`Cover of ${title}`}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageFailed(true)}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${imageLoaded ? "opacity-100" : "opacity-0"}
        `}
      />
    </div>
  );
}
