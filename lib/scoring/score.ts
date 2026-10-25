/**
 * Deterministic Book Scoring
 *
 * score = 0.35*levelMatch + 0.25*genreMatch + 0.20*semanticSimilarity
 *       + 0.10*rating + 0.10*lengthFit
 *
 * All scoring is done in code — NO LLM calls here.
 */

import { LEVEL_RUBRIC, getAdjacentLevels, type Level } from "./rubric";
import { clamp } from "@/lib/utils";

/** Scoring weights — single source of truth, easy to tune */
export const SCORING_WEIGHTS = {
  levelMatch: 0.35,
  genreMatch: 0.25,
  semanticSimilarity: 0.2,
  rating: 0.1,
  lengthFit: 0.1,
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
}

/**
 * Compute the level match score.
 * 1.0 = exact match, 0.5 = adjacent level, 0.0 = two levels apart
 */
export function scoreLevelMatch(bookLevel: Level, targetLevel: Level): number {
  if (bookLevel === targetLevel) return 1.0;
  if (getAdjacentLevels(targetLevel).includes(bookLevel)) return 0.5;
  return 0.0;
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

/**
 * Compute the total score for a book.
 * Returns a number between 0 and 1.
 */
export function scoreBook(input: ScoringInput): number {
  const w = SCORING_WEIGHTS;

  const levelScore = scoreLevelMatch(input.bookLevel, input.targetLevel);
  const genreScore = scoreGenreMatch(input.bookGenres, input.targetGenres);
  const semanticScore = clamp(input.semanticSimilarity, 0, 1);
  const ratingScore = scoreRating(input.bookAvgRating);
  const lengthScore = scoreLengthFit(input.bookPageCount, input.targetLevel);

  let total =
    w.levelMatch * levelScore +
    w.genreMatch * genreScore +
    w.semanticSimilarity * semanticScore +
    w.rating * ratingScore +
    w.lengthFit * lengthScore;

  // Apply avoid penalty
  if (
    matchesAvoidList(
      "", // title checked separately in pipeline
      input.bookTone,
      input.bookGenres,
      input.avoidList
    )
  ) {
    total *= AVOID_PENALTY;
  }

  return clamp(total, 0, 1);
}
