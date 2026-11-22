import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  AI_MODEL,
  isAiEnabled,
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_LENGTH,
} from "@/lib/ai/config";
import { buildInstructions } from "@/lib/ai/fund-context";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getFund } from "@/lib/funds/api";
import { findIndexOnOrAfter, findIndexOnOrBefore } from "@/lib/funds/returns";

const requestSchema = z.object({
  fundCode: z.number().int().positive(),
  messages: z.array(z.custom<UIMessage>()).min(1).max(50),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-mm-dd");

const getLastUserText = (messages: UIMessage[]): string => {
  const last = messages.at(-1);
  if (last?.role !== "user") return "";
  return last.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
};

const getClientId = (request: Request): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

const jsonError = (status: number, error: string, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers });

export const POST = async (request: Request) => {
  if (!isAiEnabled()) return jsonError(503, "The AI assistant isn't set up.");

  // 8 questions a minute and 60 a day per visitor, to protect the free quota
  const clientId = getClientId(request);
  const perMinute = checkRateLimit(`minute:${clientId}`, 8, 60_000);
  const perDay = checkRateLimit(`day:${clientId}`, 60, 24 * 60 * 60_000);
  const limited = !perMinute.allowed ? perMinute : !perDay.allowed ? perDay : null;
  if (limited) {
    return jsonError(429, "Too many questions. Please wait a moment and try again.", {
      "Retry-After": String(limited.retryAfterSeconds),
    });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid request.");

  const { fundCode, messages } = parsed.data;
  const question = getLastUserText(messages);
  if (!question.trim() || question.length > MAX_QUESTION_LENGTH) {
    return jsonError(400, `Questions must be 1–${MAX_QUESTION_LENGTH} characters.`);
  }

  const fund = await getFund(fundCode);
  if (!fund) return jsonError(404, "Fund not found.");

  const result = streamText({
    model: google(AI_MODEL),
    instructions: buildInstructions(fund),
    messages: await convertToModelMessages(messages.slice(-MAX_HISTORY_MESSAGES)),
    // Gemini 3 models "think" before answering, and thinking tokens count
    // towards this limit. Low thinking is enough for reading a fact sheet,
    // and the extra headroom stops answers from being cut off.
    maxOutputTokens: 2000,
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions,
    },
    temperature: 0.3,
    maxRetries: 2,
    // Allow one tool call followed by the written answer
    stopWhen: isStepCount(3),
    tools: {
      getReturnBetweenDates: tool({
        description:
          "Get this fund's NAV on two dates and the return between them. Use for questions about a specific period.",
        inputSchema: z.object({
          startDate: isoDate.describe("Start date, yyyy-mm-dd"),
          endDate: isoDate.describe("End date, yyyy-mm-dd"),
        }),
        execute: async ({ startDate, endDate }) => {
          const history = fund.navHistory;
          const startIndex = findIndexOnOrAfter(history, startDate);
          const endIndex = findIndexOnOrBefore(history, endDate);
          if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
            return {
              error: `No NAV data for that period. Data covers ${history[0].date} to ${fund.latest.date}.`,
            };
          }
          const start = history[startIndex];
          const end = history[endIndex];
          return {
            startDate: start.date,
            startNav: start.nav,
            endDate: end.date,
            endNav: end.nav,
            returnPercent: Number(((end.nav / start.nav - 1) * 100).toFixed(2)),
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
};
