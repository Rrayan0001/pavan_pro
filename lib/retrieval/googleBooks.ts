import "server-only";

import { env } from "@/lib/env";
import type { Book } from "@/lib/schemas";
import { amazonSearchUrl } from "@/lib/utils";

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
 * Search Google Books API by genre/subject.
 * Returns normalized Book objects (without score or level — those are assigned by our pipeline).
 */
export async function searchGoogleBooks(
  query: string,
  maxResults: number = 10
): Promise<Partial<Book>[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
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
      console.error(`Google Books API error: ${response.status}`);
      return [];
    }

    const data: GoogleBooksResponse = await response.json();
    if (!data.items) return [];

    return data.items
      .filter(
        (item) => item.volumeInfo.title && item.volumeInfo.authors?.length
      )
      .map(volumeToBook);
  } catch (error) {
    console.error("Google Books search failed:", error);
    return [];
  }
}

/**
 * Look up a specific book by title + author for verification.
 * Returns the best match or null.
 */
export async function verifyBook(
  title: string,
  author: string
): Promise<Partial<Book> | null> {
  const results = await searchGoogleBooks(
    `intitle:${title} inauthor:${author}`,
    3
  );

  if (results.length === 0) return null;

  return results[0];
}

/**
 * Look up a book by ISBN.
 */
export async function lookupByISBN(
  isbn: string
): Promise<Partial<Book> | null> {
  const results = await searchGoogleBooks(`isbn:${isbn}`, 1);
  return results[0] ?? null;
}

function volumeToBook(volume: GoogleBooksVolume): Partial<Book> {
  const info = volume.volumeInfo;

  const title = info.title;
  const author = info.authors?.[0] ?? "Unknown";

  return {
    title,
    author,
    genres: info.categories ?? [],
    pageCount: info.pageCount ?? null,
    description: info.description ?? null,
    coverUrl: info.imageLinks?.thumbnail?.replace("http:", "https:") ?? null,
    avgRating: info.averageRating ?? null,
    amazonSearchUrl: amazonSearchUrl(title, author),
  };
}
