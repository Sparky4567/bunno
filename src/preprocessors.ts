import { Statement } from "./statement";

export type PreprocessorFunction = (statement: Statement) => Statement;

export const cleanWhitespace: PreprocessorFunction = (statement: Statement) => {
  statement.text = statement.text.replace(/\s+/g, " ").trim();
  return statement;
};

export const unescapeHtml: PreprocessorFunction = (statement: Statement) => {
  const htmlEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };
  statement.text = statement.text.replace(/&[a-z0-9#]+;/gi, (match) => htmlEntities[match] || match);
  return statement;
};

export const toLowercase: PreprocessorFunction = (statement: Statement) => {
  statement.text = statement.text.toLowerCase();
  return statement;
};

export const removePunctuation: PreprocessorFunction = (statement: Statement) => {
  statement.text = statement.text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  return statement;
};

export const defaultPreprocessors: PreprocessorFunction[] = [
  cleanWhitespace,
  unescapeHtml,
];
