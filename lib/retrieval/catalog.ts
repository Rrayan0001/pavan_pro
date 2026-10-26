import "server-only";

import { supabase, type BookRow } from "@/lib/db/supabase";
import { getEmbeddingsModel } from "@/lib/llm";
import { searchGoogleBooks } from "@/lib/retrieval/googleBooks";
import type { Preferences, Book, Level } from "@/lib/schemas";
import { amazonSearchUrl } from "@/lib/utils";

export interface RetrievalStats {
  sqlCount: number;
  vectorCount: number;
  googleBooksCount: number;
  total: number;
  errors: string[];
}

/**
 * Search the curated book catalog using SQL filters + vector similarity,
 * augmented with live Google Books API results for queries with specific moods/subgenres.
 * Returns books sorted by relevance.
 */
export async function searchCatalog(
  preferences: Preferences,
  limit: number = 10,
  rawUserMessage?: string,
  statsCollector?: RetrievalStats
): Promise<Book[]> {
  const results: Book[] = [];

  // Step 0: If user asked about a specific book title, look for exact or ilike title match first!
  if (preferences.targetBookQuery) {
    try {
      const { data: titleMatches, error: titleErr } = await supabase
        .from("books")
        .select("*")
        .ilike("title", `%${preferences.targetBookQuery.trim()}%`)
        .limit(3);

      if (titleErr && statsCollector) {
        statsCollector.errors.push(`[STAGE 4: Title match error]: ${titleErr.message}`);
      }

      if (titleMatches && titleMatches.length > 0) {
        results.push(...titleMatches.map(rowToBook));
      }
    } catch (err: unknown) {
      if (statsCollector) statsCollector.errors.push(`[STAGE 4: Title search exception]: ${String(err)}`);
    }
  }

  // Step 1: SQL filter for exact genre + level matches
  let sqlBooks: Book[] = [];
  try {
    sqlBooks = await sqlFilterBooks(preferences, limit);
  } catch (err: unknown) {
    if (statsCollector) statsCollector.errors.push(`[STAGE 4: SQL filter exception]: ${String(err)}`);
  }
  if (statsCollector) statsCollector.sqlCount = sqlBooks.length;

  const existingIds = new Set(results.map((b) => b.id));
  for (const b of sqlBooks) {
    if (!existingIds.has(b.id)) {
      results.push(b);
      existingIds.add(b.id);
    }
  }

  // Step 2: Vector similarity search if we have mood/similarTo cues
  if (preferences.mood.length > 0 || preferences.similarTo.length > 0 || preferences.targetBookQuery) {
    let vectorBooks: Book[] = [];
    try {
      vectorBooks = await vectorSearchBooks(preferences, limit);
    } catch (err: unknown) {
      if (statsCollector) statsCollector.errors.push(`[STAGE 4: Vector search exception]: ${String(err)}`);
    }
    if (statsCollector) statsCollector.vectorCount = vectorBooks.length;

    for (const book of vectorBooks) {
      if (!existingIds.has(book.id)) {
        results.push(book);
        existingIds.add(book.id);
      }
    }
  }

  // Step 3: Live Google Books API search
  let gbCount = 0;
  try {
    const isSpecificQuery =
      preferences.mood.length > 0 ||
      preferences.similarTo.length > 0 ||
      preferences.genres.length > 1 ||
      (rawUserMessage && rawUserMessage.trim().split(" ").length > 2);

    if (results.length < limit || isSpecificQuery) {
      const searchTerms: string[] = [];

      if (rawUserMessage && rawUserMessage.trim().length <= 60) {
        searchTerms.push(rawUserMessage.trim());
      } else {
        if (preferences.genres.length > 0) {
          searchTerms.push(preferences.genres.join(" "));
        }
        if (preferences.mood.length > 0) {
          searchTerms.push(preferences.mood.slice(0, 2).join(" "));
        }
        if (preferences.similarTo.length > 0) {
          searchTerms.push(preferences.similarTo.slice(0, 2).join(" "));
        }
      }

      const queryString = searchTerms.join(" ").trim();
      if (queryString) {
        const apiCandidates = await searchGoogleBooks(queryString, 8);
        gbCount = apiCandidates.length;
        for (const apiBook of apiCandidates) {
          if (!apiBook.title || !apiBook.author) continue;

          // Avoid duplicates
          const titleLower = apiBook.title.toLowerCase();
          if (
            results.some(
              (r) =>
                r.title.toLowerCase() === titleLower ||
                r.title.toLowerCase().includes(titleLower) ||
                titleLower.includes(r.title.toLowerCase())
            )
          ) {
            continue;
          }

          const pageCount = apiBook.pageCount ?? null;
          let inferredLevel: Level = "intermediate";
          if (pageCount && pageCount <= 300) inferredLevel = "beginner";
          else if (pageCount && pageCount > 450) inferredLevel = "advanced";

          const book: Book = {
            id: crypto.randomUUID(),
            title: apiBook.title,
            author: apiBook.author,
            genres:
              preferences.genres.length > 0
                ? preferences.genres
                : (apiBook.genres && apiBook.genres.length > 0 ? apiBook.genres : ["fiction"]),
            level: preferences.level ?? inferredLevel,
            complexity:
              inferredLevel === "beginner" ? 2 : inferredLevel === "intermediate" ? 3 : 4,
            pacing: "medium",
            tone: preferences.mood.length > 0 ? preferences.mood : ["engaging"],
            pageCount,
            description: apiBook.description ?? null,
            coverUrl: apiBook.coverUrl ?? null,
            avgRating: apiBook.avgRating ?? 4.0,
            whyStartHere: `Verified book fact lookup via Google Books API matching "${queryString}".`,
            amazonSearchUrl: apiBook.amazonSearchUrl,
          };

          results.push(book);
        }
      }
    }
  } catch (apiErr: unknown) {
    console.error("Live Google Books candidate retrieval failed:", apiErr);
    if (statsCollector) statsCollector.errors.push(`[STAGE 4: Google Books error]: ${String(apiErr)}`);
  }

  if (statsCollector) {
    statsCollector.googleBooksCount = gbCount;
    statsCollector.total = results.length;
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
