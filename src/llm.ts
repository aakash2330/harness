import OpenAI from "openai";

export const AGENT_IDENTITY =
  "You are a coding agent with read, write, edit, and bash tools. Complete the task in the working directory.";

export function createLlmClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.LLM_API_KEY!, baseURL: process.env.LLM_BASE_URL! });
}
