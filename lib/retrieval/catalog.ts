import "server-only";

import { supabase, type BookRow } from "@/lib/db/supabase";
import { getEmbeddingsModel } from "@/lib/llm";
import type { Preferences, Book } from "@/lib/schemas";
import { amazonSearchUrl } from "@/lib/utils";

/**
 * Search the curated book catalog using SQL filters + vector similarity.
 * Returns books sorted by vector similarity.
 */
export async function searchCatalog(
  preferences: Preferences,
  limit: number = 10
): Promise<Book[]> {
  const results: Book[] = [];

  // Step 1: SQL filter for exact genre + level matches
  const sqlBooks = await sqlFilterBooks(preferences, limit);
  results.push(...sqlBooks);

  // Step 2: Vector similarity search if we have mood/similarTo cues
  if (preferences.mood.length > 0 || preferences.similarTo.length > 0) {
    const vectorBooks = await vectorSearchBooks(preferences, limit);

    // Merge, deduplicate by id
    const existingIds = new Set(results.map((b) => b.id));
    for (const book of vectorBooks) {
      if (!existingIds.has(book.id)) {
        results.push(book);
        existingIds.add(book.id);
      }
    }
  }

  return results;
}

/**
 * SQL filter: find books matching genre and level.
 */
async function sqlFilterBooks(
  preferences: Preferences,
  limit: number
): Promise<Book[]> {
  let query = supabase.from("books").select("*").limit(limit);

  // Filter by level (exact or adjacent)
  if (preferences.level) {
    query = query.eq("level", preferences.level);
  }

  // Filter by genre (any genre in the array)
  if (preferences.genres.length > 0) {
    query = query.overlaps("genres", preferences.genres);
  }

  // Filter by max pages if specified
  if (preferences.maxPages) {
    query = query.lte("page_count", preferences.maxPages);
  }

  const { data, error } = await query;

  if (error) {
    console.error("SQL filter error:", error);
    return [];
  }

  return (data ?? []).map(rowToBook);
}

/**
 * Vector similarity search using the match_books function.
 */
async function vectorSearchBooks(
  preferences: Preferences,
  limit: number
): Promise<Book[]> {
  try {
    const embeddings = getEmbeddingsModel();

    // Build a search query from mood + similarTo
    const searchText = [
      ...preferences.mood,
      ...preferences.similarTo.map((s) => `similar to ${s}`),
      ...preferences.genres,
    ].join(", ");

    const queryEmbedding = await embeddings.embedQuery(searchText);

    const { data, error } = await supabase.rpc("match_books", {
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_genre: preferences.genres[0] ?? null,
      filter_level: preferences.level ?? null,
    });

    if (error) {
      console.error("Vector search error:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Fetch full book data for matched IDs
    const ids = data.map((d: { id: string }) => d.id);
    const { data: books, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .in("id", ids);

    if (fetchError || !books) return [];

    return books.map((row: BookRow) => rowToBook(row));
  } catch (error) {
    console.error("Vector search failed:", error);
    return [];
  }
}

/**
 * Get books for a reading ladder by genre.
 * Returns 3 books ordered by increasing complexity.
 */
export async function getReadingLadder(
  genre: string
): Promise<Book[]> {
  // First try the reading_ladders table
  const { data: ladderData } = await supabase
    .from("reading_ladders")
    .select("*, books(*)")
    .eq("genre", genre)
    .order("step", { ascending: true })
    .limit(3);

  if (ladderData && ladderData.length > 0) {
    const validLadder = ladderData.filter(
      (l: { books: BookRow | null }) => l.books !== null
    );
    if (validLadder.length > 0) {
      return validLadder.map((l: { books: BookRow }) => rowToBook(l.books));
    }
  }

  // Fallback: pick 3 books from the catalog with increasing complexity
  const { data: books } = await supabase
    .from("books")
    .select("*")
    .contains("genres", [genre])
    .order("complexity", { ascending: true })
    .limit(3);

  return (books ?? []).map(rowToBook);
}

/**
 * Convert a database row to a Book object for the UI.
 */
function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genres: row.genres,
    level: row.level,
    complexity: row.complexity,
    pacing: row.pacing,
    tone: row.tone,
    pageCount: row.page_count,
    description: row.description,
    coverUrl: row.cover_url,
    avgRating: row.avg_rating,
    whyStartHere: row.why_start_here,
    amazonSearchUrl: amazonSearchUrl(row.title, row.author),
  };
}
