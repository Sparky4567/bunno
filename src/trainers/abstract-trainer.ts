import { ChatBot } from "../chatbot";

export abstract class Trainer {
  protected chatbot: ChatBot;

  constructor(chatbot: ChatBot) {
    this.chatbot = chatbot;
  }

  public abstract train(...args: any[]): void | Promise<void>;
}
