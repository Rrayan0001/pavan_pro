/**
 * Deterministic Book Scoring
 *
 * score = 0.30*levelMatch + 0.20*genreMatch + 0.25*semanticSimilarity
 *       + 0.10*toneAndSubGenreMatch + 0.10*rating + 0.05*lengthFit
 *
 * All scoring is done in code — NO LLM calls here.
 */

import { LEVEL_RUBRIC, getAdjacentLevels, type Level } from "./rubric";
import { clamp } from "@/lib/utils";

/** Scoring weights — single source of truth, easy to tune */
export const SCORING_WEIGHTS = {
  levelMatch: 0.30,
  genreMatch: 0.20,
  semanticSimilarity: 0.25,
  toneAndSubGenreMatch: 0.10,
  rating: 0.10,
  lengthFit: 0.05,
} as const;

/** Penalty multiplier for books in the user's "avoid" list */
export const AVOID_PENALTY = 0.1;

export interface ScoringInput {
  /** The book's assigned level */
  bookLevel: Level;
  /** The book's genres */
  bookGenres: string[];
  /** The book's page count (null if unknown) */
  bookPageCount: number | null;
  /** The book's average rating (0-5 scale, null if unknown) */
  bookAvgRating: number | null;
  /** The book's tone tags */
  bookTone: string[];
  /** Semantic similarity score from vector search (0-1) */
  semanticSimilarity: number;
  /** The user's requested level */
  targetLevel: Level;
  /** The user's requested genres */
  targetGenres: string[];
  /** Topics/keywords the user wants to avoid */
  avoidList: string[];
  /** Target sub-genres (e.g. rom-com, slow-burn) */
  targetSubGenres?: string[];
  /** Target mood/atmosphere cues */
  targetMood?: string[];
  /** Heat level preference (clean, mild, steamy) */
  heatLevel?: string | null;
  /** Whether the book has already been seen in this session */
  isExcluded?: boolean;
}

/**
 * Compute the level match score.
 * 1.0 = exact match, 0.5 = adjacent level, 0.1 = two levels apart
 */
export function scoreLevelMatch(bookLevel: Level, targetLevel: Level): number {
  if (bookLevel === targetLevel) return 1.0;
  if (getAdjacentLevels(targetLevel).includes(bookLevel)) return 0.5;
  return 0.1;
}

/**
 * Compute the genre match score.
 * Returns the fraction of target genres that appear in the book's genres.
 * If no target genres provided, returns 1.0 (no filtering).
 */
export function scoreGenreMatch(
  bookGenres: string[],
  targetGenres: string[]
): number {
  if (targetGenres.length === 0) return 1.0;

  const normalizedBookGenres = bookGenres.map((g) => g.toLowerCase().trim());
  const matchCount = targetGenres.filter((tg) =>
    normalizedBookGenres.includes(tg.toLowerCase().trim())
  ).length;

  return matchCount / targetGenres.length;
}

/**
 * Compute the length fit score.
 * 1.0 = within the level's ideal page range
 * Decays linearly outside the range, down to 0.0
 */
export function scoreLengthFit(
  pageCount: number | null,
  targetLevel: Level
): number {
  if (pageCount === null) return 0.5; // unknown = neutral

  const { min, max } = LEVEL_RUBRIC[targetLevel].pageRange;

  if (pageCount >= min && pageCount <= max) return 1.0;

  // Decay: lose 0.01 per page below min, 0.002 per page above max, floor at 0.0
  if (pageCount < min) {
    return clamp(1.0 - (min - pageCount) * 0.01, 0, 1);
  }
  return clamp(1.0 - (pageCount - max) * 0.002, 0, 1);
}

/**
 * Normalize a book's average rating to 0-1 scale.
 * Assumes ratings are on a 0-5 scale.
 */
export function scoreRating(avgRating: number | null): number {
  if (avgRating === null) return 0.5; // unknown = neutral
  return clamp(avgRating / 5.0, 0, 1);
}

/**
 * Compute match for tone, sub-genres, and heat level.
 * Returns 1.0 if no specific cues were asked, or a score based on overlap.
 */
export function scoreToneAndSubGenreMatch(
  bookTone: string[],
  targetSubGenres: string[] = [],
  targetMood: string[] = [],
  heatLevel?: string | null
): number {
  const targets = [
    ...targetSubGenres.map((s) => s.toLowerCase().trim()),
    ...targetMood.map((m) => m.toLowerCase().trim()),
  ];

  const bookTonesLower = bookTone.map((t) => t.toLowerCase().trim());
  let targetCount = targets.length;
  let matches = 0;

  for (const target of targets) {
    if (bookTonesLower.some((bt) => bt.includes(target) || target.includes(bt))) {
      matches++;
    }
  }

  if (heatLevel && heatLevel !== "clean") {
    targetCount++;
    const heatKeywords = heatLevel === "steamy" ? ["steamy", "spicy", "smut", "erotic"] : [heatLevel.toLowerCase()];
    if (bookTonesLower.some((bt) => heatKeywords.some((hk) => bt.includes(hk) || hk.includes(bt)))) {
      matches++;
    }
  }

  if (targetCount === 0) {
    return 1.0; // neutral / full credit if user didn't specify tone/sub-genre constraints
  }

  if (matches > 0) {
    return clamp(0.5 + 0.5 * (matches / targetCount), 0, 1);
  }
  return 0.3; // base score if no explicit match
}

/**
 * Check if a book matches any items in the avoid list.
 * Returns true if the book should be penalized.
 */
export function matchesAvoidList(
  bookTitle: string,
  bookTone: string[],
  bookGenres: string[],
  avoidList: string[]
): boolean {
  if (avoidList.length === 0) return false;

  const searchable = [
    bookTitle.toLowerCase(),
    ...bookTone.map((t) => t.toLowerCase()),
    ...bookGenres.map((g) => g.toLowerCase()),
  ].join(" ");

  return avoidList.some((term) =>
    searchable.includes(term.toLowerCase().trim())
  );
}

export interface ScoreBreakdown {
  levelMatch: number;
  genreMatch: number;
  semanticSimilarity: number;
  toneAndSubGenreMatch: number;
  rating: number;
  lengthFit: number;
  total: number;
}

/**
 * Compute the detailed score breakdown for a book.
 */
export function scoreBookDetailed(input: ScoringInput): ScoreBreakdown {
  const w = SCORING_WEIGHTS;

  const levelScore = scoreLevelMatch(input.bookLevel, input.targetLevel);
  const genreScore = scoreGenreMatch(input.bookGenres, input.targetGenres);
  const semanticScore = clamp(input.semanticSimilarity, 0, 1);
  const toneScore = scoreToneAndSubGenreMatch(
    input.bookTone,
    input.targetSubGenres,
    input.targetMood,
    input.heatLevel
  );
  const ratingScore = scoreRating(input.bookAvgRating);
  const lengthScore = scoreLengthFit(input.bookPageCount, input.targetLevel);

  let total =
    w.levelMatch * levelScore +
    w.genreMatch * genreScore +
    w.semanticSimilarity * semanticScore +
    w.toneAndSubGenreMatch * toneScore +
    w.rating * ratingScore +
    w.lengthFit * lengthScore;

  if (
    matchesAvoidList(
      "",
      input.bookTone,
      input.bookGenres,
      input.avoidList
    )
  ) {
    total *= AVOID_PENALTY;
  }

  if (input.isExcluded) {
    total = Math.max(0, total - 0.5);
  }

  return {
    levelMatch: levelScore,
    genreMatch: genreScore,
    semanticSimilarity: semanticScore,
    toneAndSubGenreMatch: toneScore,
    rating: ratingScore,
    lengthFit: lengthScore,
    total: clamp(total, 0, 1),
  };
}

/**
 * Compute the total score for a book.
 * Returns a number between 0 and 1.
 */
export function scoreBook(input: ScoringInput): number {
  return scoreBookDetailed(input).total;
}

/**
 * Cosine similarity between two numerical vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0.5;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Pairwise similarity metric between two books for diversity ranking.
 */
export function computeItemSimilarity(
  itemA: { id: string; author?: string; genres?: string[]; embedding?: number[] | null },
  itemB: { id: string; author?: string; genres?: string[]; embedding?: number[] | null }
): number {
  if (itemA.id === itemB.id) return 1.0;
  if (
    itemA.embedding &&
    itemB.embedding &&
    itemA.embedding.length > 0 &&
    itemA.embedding.length === itemB.embedding.length
  ) {
    return Math.max(0, cosineSimilarity(itemA.embedding, itemB.embedding));
  }
  if (itemA.author && itemB.author && itemA.author.toLowerCase() === itemB.author.toLowerCase()) {
    return 0.85;
  }
  if (itemA.genres && itemB.genres && itemA.genres.length > 0 && itemB.genres.length > 0) {
    const setB = new Set(itemB.genres.map((g) => g.toLowerCase()));
    const common = itemA.genres.filter((g) => setB.has(g.toLowerCase())).length;
    return common > 0 ? 0.4 : 0.1;
  }
  return 0.2;
}

/**
 * Maximal Marginal Relevance (MMR) for selecting diverse, high-relevance recommendations.
 * @param items Candidate items sorted or scored with `score`.
 * @param k Number of diverse items to select.
 * @param lambda Trade-off between relevance (1.0) and diversity (0.0). Default = 0.7.
 */
export function maximalMarginalRelevance<
  T extends { id: string; score?: number; author?: string; genres?: string[]; embedding?: number[] | null }
>(items: T[], k: number = 5, lambda: number = 0.7): T[] {
  if (items.length <= k) return [...items];

  const remaining = [...items];
  const selected: T[] = [];

  // Pick top-relevance candidate first
  remaining.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const first = remaining.shift()!;
  selected.push(first);

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = -1;
    let bestMmrScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.score ?? 0;

      let maxSim = 0;
      for (const sel of selected) {
        const sim = computeItemSimilarity(cand, sel);
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(remaining.splice(bestIdx, 1)[0]);
    } else {
      break;
    }
  }

  return selected;
}
