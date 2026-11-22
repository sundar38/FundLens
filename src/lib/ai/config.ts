// The AI assistant is optional: without a key the chat panel is hidden and
// the rest of FundLens works as normal.
export const isAiEnabled = (): boolean => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Free-tier model availability changes often, so the model is configurable.
export const AI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

export const MAX_QUESTION_LENGTH = 500;
// Only the latest messages are sent to the model, to keep requests small.
export const MAX_HISTORY_MESSAGES = 10;
