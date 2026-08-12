import { Statement } from "./statement";

export type ResponseSelectionMethod = (statements: Statement[]) => Statement;

export const getFirstResponse: ResponseSelectionMethod = (statements: Statement[]): Statement => {
  if (!statements.length) {
    throw new Error("Cannot select response from an empty array of statements.");
  }
  return statements[0];
};

export const getMostFrequentResponse: ResponseSelectionMethod = (statements: Statement[]): Statement => {
  if (!statements.length) {
    throw new Error("Cannot select response from an empty array of statements.");
  }
  let best = statements[0];
  for (let i = 1; i < statements.length; i++) {
    if (statements[i].occurrence_count > best.occurrence_count) {
      best = statements[i];
    }
  }
  return best;
};

export const getRandomResponse: ResponseSelectionMethod = (statements: Statement[]): Statement => {
  if (!statements.length) {
    throw new Error("Cannot select response from an empty array of statements.");
  }
  const index = Math.floor(Math.random() * statements.length);
  return statements[index];
};
