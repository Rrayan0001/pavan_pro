import { z } from "zod";

/** Supported genres */
export const GENRES = [
  "romance",
  "thriller",
  "horror",
  "action/adventure",
  "mystery",
  "sci-fi",
  "fantasy",
  "motivational/self-help",
  "non-fiction",
  "classics",
] as const;

export type Genre = (typeof GENRES)[number];

/** Reader levels */
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

/** Schema for parsed user preferences (LLM output) */
export const PreferencesSchema = z.object({
  genres: z.array(z.enum(GENRES)).min(1),
  level: z.enum(LEVELS).default("beginner"),
  maxPages: z.number().int().min(1).optional(),
  mood: z.array(z.string()).default([]),
  similarTo: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  targetBookQuery: z.string().optional().describe("If the user is asking about a specific book or title (e.g. 'The Notebook'), extract the book title here"),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

/** Schema for the recommendation request body */
export const RecommendRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Please enter a question or description of what you'd like to read.")
    .max(4000, "Message is too long (maximum 4000 characters)."),
  genre: z
    .enum(GENRES)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val && typeof val === "string" && val.trim() ? (val as Genre) : undefined)),
  level: z
    .enum(LEVELS)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val && typeof val === "string" && val.trim() ? (val as Level) : undefined)),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val && typeof val === "string" && val.trim() ? val.trim().toLowerCase() : undefined)),
  chatId: z
    .string()
    .uuid("Invalid chat identifier format.")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val && typeof val === "string" && val.trim() ? val.trim() : undefined)),
});

export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

/** A verified book with score, ready for the UI */
export const BookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  author: z.string(),
  genres: z.array(z.string()),
  level: z.enum(LEVELS),
  complexity: z.number().min(1).max(5),
  pacing: z.enum(["slow", "medium", "fast"]),
  tone: z.array(z.string()),
  pageCount: z.number().nullable(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  avgRating: z.number().nullable(),
  whyStartHere: z.string().nullable(),
  score: z.number().optional(),
  amazonSearchUrl: z.string().url().optional(),
});

export type Book = z.infer<typeof BookSchema>;

/** Reading ladder step */
export const LadderStepSchema = z.object({
  step: z.number().min(1).max(3),
  book: BookSchema,
  note: z.string().nullable(),
});

export type LadderStep = z.infer<typeof LadderStepSchema>;

/** API response event types for SSE streaming */
export type StreamEvent =
  | { type: "books"; data: Book[] }
  | { type: "ladder"; data: LadderStep[] }
  | { type: "text"; data: string }
  | { type: "chatId"; data: string }
  | { type: "error"; data: string }
  | { type: "done" };
