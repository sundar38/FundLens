"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_QUESTION_LENGTH } from "@/lib/ai/config";

type FundChatProps = {
  fundCode: number;
  fundName: string;
};

const SUGGESTED_QUESTIONS = [
  "How has this fund performed?",
  "How risky has this fund been?",
  "How did it do in 2022?",
  "Explain this fund's category simply",
];

const renderMessageParts = (message: UIMessage) =>
  message.parts.map((part, index) => {
    const key = `${message.id}-${index}`;
    if (part.type === "text") {
      return (
        <p key={key} className="whitespace-pre-wrap">
          {part.text}
        </p>
      );
    }
    if (part.type === "tool-getReturnBetweenDates") {
      return (
        <p key={key} className="text-xs text-muted-foreground">
          {part.state === "output-available"
            ? "Looked up NAVs for the period you asked about."
            : "Looking up NAVs for that period…"}
        </p>
      );
    }
    return null;
  });

// Plain React: useChat streams the answer from /api/chat token by token.
const FundChat = ({ fundCode, fundName }: FundChatProps) => {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { fundCode } }),
    [fundCode],
  );
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <section aria-labelledby="chat-heading" className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 id="chat-heading" className="font-semibold">
          Ask about this fund
        </h2>
        <p className="text-sm text-muted-foreground">
          An AI assistant that answers from {fundName}’s NAV data. Educational only, not
          investment advice.
        </p>
      </div>

      {messages.length === 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
          {SUGGESTED_QUESTIONS.map((question) => (
            <li key={question}>
              <Button type="button" variant="outline" size="sm" onClick={() => ask(question)}>
                {question}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div role="log" aria-live="polite" className="flex flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "flex flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              <span className="sr-only">{message.role === "user" ? "You:" : "Assistant:"}</span>
              {renderMessageParts(message)}
            </div>
          ))}
          {status === "submitted" && (
            <p className="text-sm text-muted-foreground">
              Thinking… The free AI model can take up to 30 seconds when it’s busy.
            </p>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 text-sm text-red-700">
          <span>The assistant couldn’t answer right now. Please try again.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => regenerate()}>
            Retry
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="chat-question" className="sr-only">
          Your question about this fund
        </label>
        <Input
          id="chat-question"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. What was its worst fall?"
          maxLength={MAX_QUESTION_LENGTH}
          autoComplete="off"
          className="h-9"
        />
        {isBusy ? (
          <Button type="button" variant="outline" size="lg" onClick={() => stop()}>
            Stop
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!input.trim()}>
            Ask
          </Button>
        )}
      </form>
    </section>
  );
};

export default FundChat;
