import { ChatBot } from "../chatbot";
import { Trainer } from "./abstract-trainer";
import { ListTrainer } from "./list-trainer";
import greetingsCorpus from "../corpus/data/greetings.json";
import conversationsCorpus from "../corpus/data/conversations.json";
import aiCorpus from "../corpus/data/ai.json";
import computersCorpus from "../corpus/data/computers.json";
import scienceCorpus from "../corpus/data/science.json";
import psychologyCorpus from "../corpus/data/psychology.json";
import triviaCorpus from "../corpus/data/trivia.json";
import historyCorpus from "../corpus/data/history.json";
import geographyCorpus from "../corpus/data/geography.json";
import healthCorpus from "../corpus/data/health.json";
import mathFactsCorpus from "../corpus/data/math_facts.json";
import literatureCorpus from "../corpus/data/literature.json";

export interface CorpusData {
  categories: string[];
  conversations: string[][];
}

export class ChatterBotCorpusTrainer extends Trainer {
  private listTrainer: ListTrainer;
  private customCorpora: Record<string, CorpusData> = {};

  private builtinCorpora: Record<string, CorpusData> = {
    "greetings": greetingsCorpus as CorpusData,
    "conversations": conversationsCorpus as CorpusData,
    "ai": aiCorpus as CorpusData,
    "computers": computersCorpus as CorpusData,
    "science": scienceCorpus as CorpusData,
    "psychology": psychologyCorpus as CorpusData,
    "trivia": triviaCorpus as CorpusData,
    "history": historyCorpus as CorpusData,
    "geography": geographyCorpus as CorpusData,
    "health": healthCorpus as CorpusData,
    "math_facts": mathFactsCorpus as CorpusData,
    "literature": literatureCorpus as CorpusData,
  };

  constructor(chatbot: ChatBot) {
    super(chatbot);
    this.listTrainer = new ListTrainer(chatbot);

    // Alias all corpora under bunno.corpus.english.<name>
    for (const key of Object.keys(this.builtinCorpora)) {
      this.builtinCorpora[`bunno.corpus.english.${key}`] = this.builtinCorpora[key];
    }
  }

  public registerCorpus(name: string, corpus: CorpusData): void {
    this.customCorpora[name.toLowerCase()] = corpus;
  }

  public train(...corpusNames: (string | CorpusData)[]): void {
    for (const item of corpusNames) {
      if (typeof item === "string") {
        const lowerKey = item.toLowerCase();
        if (lowerKey === "bunno.corpus.english" || lowerKey === "chatterbot.corpus.english") {
          // Train all built-in english corpora
          for (const key of Object.keys(this.builtinCorpora)) {
            this.trainCorpusData(this.builtinCorpora[key]);
          }
        } else if (this.customCorpora[lowerKey]) {
          this.trainCorpusData(this.customCorpora[lowerKey]);
        } else if (this.builtinCorpora[lowerKey]) {
          this.trainCorpusData(this.builtinCorpora[lowerKey]);
        }
      } else if (typeof item === "object" && Array.isArray(item.conversations)) {
        this.trainCorpusData(item);
      }
    }
  }

  private trainCorpusData(corpus: CorpusData): void {
    const tags = corpus.categories || [];
    for (const conversation of corpus.conversations) {
      this.listTrainer.train(conversation, tags);
    }
  }
}
