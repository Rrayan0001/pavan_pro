/**
 * Sanitizes AI-generated text to remove unseemly raw markdown artifacts:
 * - Bold/italic markers (**word**, *word*, __word__, _word_)
 * - Header markers (### Header -> Header)
 * - Raw markdown list symbols (* bullet, - bullet, + bullet)
 * - Excessive leading or trailing formatting symbols
 *
 * Leaves clean, readable natural prose.
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // Remove header markers (e.g. ### Title -> Title)
    .replace(/^#{1,6}\s+/gm, "")
    // Replace bullet symbols and numbered lists at beginning of lines (* item, - item, 1. item)
    .replace(/^[\t ]*(?:[*\-+]\s+|\d+\.\s+)/gm, "")
    // Remove bold and italic markers on single lines (***text***, **text**, *text*, __text__, _text_)
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, "$1")
    // Remove inline backticks
    .replace(/`([^`\n]+)`/g, "$1")
    // Clean multiple consecutive newlines down to max 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
