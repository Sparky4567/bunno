import { Statement } from "../statement";
import { ChatBot } from "../chatbot";
import { Trainer } from "./abstract-trainer";

export class ListTrainer extends Trainer {
  constructor(chatbot: ChatBot) {
    super(chatbot);
  }

  public train(conversation: string[], tags?: string[]): void {
    if (!conversation || conversation.length === 0) return;

    let previousStatementText: string | null = null;

    for (const text of conversation) {
      const statement = new Statement({
        text,
        in_response_to: previousStatementText,
        tags: tags ? [...tags] : [],
      });

      this.chatbot.storage.create(statement);
      previousStatementText = text;
    }
  }
}
