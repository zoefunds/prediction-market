/**
 * Build search keywords from a market's question, description, and category.
 * Stored in `searchKeywords[]` so Firestore can do array-contains queries.
 */
export function buildSearchKeywords(
  question: string,
  description: string,
  category: string,
  tags: string[] = [],
): string[] {
  const corpus = `${question} ${description} ${category} ${tags.join(" ")}`;
  const tokens = corpus
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 32);
  return Array.from(new Set(tokens)).slice(0, 60);
}
