import * as emoji from "node-emoji";

/**
 * Returns a random emoji from thousands of available emojis using node-emoji
 */
export function getRandomEmoji(): string {
  const item = emoji.random();
  return item.emoji;
}

/**
 * Appends a random emoji from node-emoji to the end of text
 */
export function appendRandomEmoji(text: string): string {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();
  const randomChar = getRandomEmoji();
  return `${trimmed} ${randomChar}`;
}

export { emoji };
