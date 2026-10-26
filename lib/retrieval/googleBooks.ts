import "server-only";

import { env } from "@/lib/env";
import type { Book } from "@/lib/schemas";
import { amazonSearchUrl } from "@/lib/utils";
import { searchOpenLibrary } from "./openLibrary";

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

/**
 * Search Google Books API with automatic fallback to Open Library.
 * Requests up to 20 results, normalizes to Book, and filters out incomplete entries.
 */
export async function searchGoogleBooks(
  query: string,
  maxResults: number = 20
): Promise<Partial<Book>[]> {
  const seenIds = new Set<string>();
  const seenTitleAuthors = new Set<string>();

  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(maxResults, 40)),
      orderBy: "relevance",
      printType: "books",
      langRestrict: "en",
    });

    if (env.GOOGLE_BOOKS_API_KEY) {
      params.set("key", env.GOOGLE_BOOKS_API_KEY);
    }

    const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(
        `[Google Books API] Request failed with status ${response.status} for query: "${query}". Initiating Open Library fallback.`
      );
      return await searchOpenLibrary(query, maxResults);
    }

    const data: GoogleBooksResponse = await response.json();
    if (!data.items || data.items.length === 0) {
      console.warn(
        `[Google Books API] Empty list returned for query: "${query}". Initiating Open Library fallback.`
      );
      return await searchOpenLibrary(query, maxResults);
    }

    const books: Partial<Book>[] = [];

    for (const item of data.items) {
      const info = item.volumeInfo;
      // Skip results missing title, author, page count, or description per Task 1
      if (!info.title || !info.authors?.length || !info.pageCount || !info.description) {
        continue;
      }

      // Deduplicate by google_books_id, then by normalized title + author
      const normKey = `${info.title.toLowerCase().trim()}|${info.authors[0].toLowerCase().trim()}`;
      if (seenIds.has(item.id) || seenTitleAuthors.has(normKey)) {
        continue;
      }
      seenIds.add(item.id);
      seenTitleAuthors.add(normKey);

      // Upgrade thumbnail URL to HTTPS and zoom=2
      let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
      if (cover) {
        cover = cover.replace(/^http:\/\//i, "https://");
        if (cover.includes("&zoom=")) {
          cover = cover.replace(/&zoom=\d/, "&zoom=2");
        }
      }

      books.push({
        id: item.id,
        title: info.title.trim(),
        author: info.authors[0].trim(),
        genres: info.categories ?? [],
        pageCount: info.pageCount,
        description: info.description.trim(),
        coverUrl: cover,
        avgRating: info.averageRating ?? null,
        amazonSearchUrl: amazonSearchUrl(info.title, info.authors[0]),
      });
    }

    if (books.length === 0) {
      return await searchOpenLibrary(query, maxResults);
    }

    return books;
  } catch (error: unknown) {
    console.error(`[Google Books API Exception] for query "${query}":`, error);
    return await searchOpenLibrary(query, maxResults);
  }
}

/**
 * Look up a specific book by title + author for verification.
 */
export async function verifyBook(
  title: string,
  author: string
): Promise<Partial<Book> | null> {
  const results = await searchGoogleBooks(
    `intitle:${title} inauthor:${author}`,
    3
  );
  return results[0] ?? null;
}
