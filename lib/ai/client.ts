import OpenAI from "openai";

// Lazy singleton: `new OpenAI(...)` throws immediately if OPENAI_API_KEY is
// missing, which breaks Next.js's build-time page-data collection even for
// routes marked `force-dynamic`. Holding construction until first property
// access keeps the module safely importable without env vars.
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Configure it in your environment (Vercel project settings) before using AI features.",
    );
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

/**
 * OpenAI client proxy. Every property access goes through the lazy getter
 * above, so importing this module never instantiates the SDK on its own.
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o";
