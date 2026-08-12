import { Statement } from "../statement";

export type ComparisonFunction = (a: Statement, b: Statement) => number;

/**
 * Calculates normalized Levenshtein distance between two statements (0.0 to 1.0)
 */
export const LevenshteinDistance: ComparisonFunction = (a: Statement, b: Statement): number => {
  const s1 = a.search_text || Statement.normalize(a.text);
  const s2 = b.search_text || Statement.normalize(b.text);

  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const dist = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = 1.0 - dist / maxLen;
  return Math.max(0.0, Math.min(1.0, similarity));
};

/**
 * Calculates Jaccard token set similarity (0.0 to 1.0)
 */
export const JaccardSimilarity: ComparisonFunction = (a: Statement, b: Statement): number => {
  const s1 = a.search_text || Statement.normalize(a.text);
  const s2 = b.search_text || Statement.normalize(b.text);

  const tokens1 = new Set(s1.split(/\s+/).filter(Boolean));
  const tokens2 = new Set(s2.split(/\s+/).filter(Boolean));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = tokens1.size + tokens2.size - intersectionCount;
  return unionSize === 0 ? 0.0 : intersectionCount / unionSize;
};

/**
 * Combination of Jaccard and Levenshtein for robust fuzzy comparison
 */
export const HybridSimilarity: ComparisonFunction = (a: Statement, b: Statement): number => {
  const lev = LevenshteinDistance(a, b);
  const jac = JaccardSimilarity(a, b);
  return 0.6 * lev + 0.4 * jac;
};
