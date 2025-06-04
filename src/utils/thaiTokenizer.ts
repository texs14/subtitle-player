// src/utils/thaiTokenizer.ts
/**
 * Splits a Thai sentence into tokens, where each token is either:
 *  - a contiguous run of Thai characters (Unicode block U+0E00–U+0E7F),
 *  - or a single non-Thai character (punctuation, Latin letters, spaces, etc).
 *
 * This ensures that we never break Thai words in the middle of a character sequence.
 */
export default function tokenizeThaiSentence(sentence: string): string[] {
  // Regex explanation:
  //   [\u0E00-\u0E7F]+    → one or more Thai characters
  //   |\\.               → or any single character (including space/punct)
  // The `/g` flag ensures we capture all tokens in order.
  const pattern = /[\u0E00-\u0E7F]+|./g;
  const matches = sentence.match(pattern);
  return matches ? matches.filter(tok => tok.trim().length > 0) : [];
}
