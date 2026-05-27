import { fetch } from '#platform/server/fetch';

import type {
  CategorySuggestionResult,
  SavingsAdvisorChatMessage,
  SavingsAdvisorResponse,
} from './types';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:4b';
const CATEGORY_PROMPT_VERSION = 'category-v1';
const ADVISOR_PROMPT_VERSION = 'advisor-v1';
const ADVISOR_CHAT_PROMPT_VERSION = 'advisor-chat-v1';

function getEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

export function getOllamaConfig() {
  return {
    baseUrl: (getEnv('OLLAMA_BASE_URL') || DEFAULT_OLLAMA_BASE_URL).replace(
      /\/$/,
      '',
    ),
    model: getEnv('OLLAMA_MODEL') || DEFAULT_OLLAMA_MODEL,
  };
}

export async function checkOllamaStatus() {
  const { baseUrl, model } = getOllamaConfig();

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { available: false, model, error: `HTTP ${response.status}` };
    }

    const body = await response.json();
    const models: Array<{ name?: string }> = Array.isArray(body?.models)
      ? body.models
      : [];
    const hasModel = models.some(entry => entry?.name === model);

    return { available: true, model, hasModel };
  } catch (error) {
    return {
      available: false,
      model,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function requestJson<T>({
  messages,
  schema,
  temperature = 0.1,
}: {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  schema: object;
  temperature?: number;
}): Promise<T | null> {
  const { baseUrl, model } = getOllamaConfig();

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: schema,
        options: {
          temperature,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    const content = body?.message?.content;
    if (typeof content !== 'string') {
      return null;
    }

    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function stripQwenThinking(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s+/, '')
    .trim();
}

async function requestText({
  messages,
  temperature = 0.2,
}: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
}): Promise<string | null> {
  const { baseUrl, model } = getOllamaConfig();

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    const content = body?.message?.content;
    if (typeof content !== 'string') {
      return null;
    }

    return stripQwenThinking(content);
  } catch {
    return null;
  }
}

export async function requestOllamaCategorySuggestion({
  normalizedPayee,
  amount,
  categories,
  recentContext,
}: {
  normalizedPayee: string;
  amount: number;
  categories: Array<{ id: string; name: string; groupName: string }>;
  recentContext: string[];
}): Promise<(CategorySuggestionResult & { source: 'ollama' }) | null> {
  const { model } = getOllamaConfig();
  const payload = await requestJson<{
    categoryId: string | null;
    confidence: number;
    reason: string;
    suggestedRule: string | null;
  }>({
    messages: [
      {
        role: 'system',
        content:
          'You categorize personal finance transactions. Return only JSON. Use only categoryId values from the provided category list. If unsure, return categoryId null and confidence below 0.75.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          normalizedPayee,
          amount,
          categories,
          recentContext,
        }),
      },
    ],
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: ['string', 'null'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reason: { type: 'string' },
        suggestedRule: { type: ['string', 'null'] },
      },
      required: ['categoryId', 'confidence', 'reason', 'suggestedRule'],
      additionalProperties: false,
    },
  });

  if (!payload) {
    return null;
  }

  const validCategoryIds = new Set(categories.map(category => category.id));
  const categoryId =
    payload.categoryId && validCategoryIds.has(payload.categoryId)
      ? payload.categoryId
      : null;
  const confidence = Math.max(0, Math.min(1, Number(payload.confidence) || 0));

  if (!categoryId || confidence < 0.75) {
    return null;
  }

  return {
    source: 'ollama',
    categoryId,
    confidence,
    reason: payload.reason,
    shouldAutoApply: confidence >= 0.95,
    suggestedRule: payload.suggestedRule,
    normalizedPayee,
    model,
    promptVersion: CATEGORY_PROMPT_VERSION,
  };
}

export async function requestOllamaSavingsAdvice(metrics: object) {
  const payload = await requestJson<SavingsAdvisorResponse>({
    messages: [
      {
        role: 'system',
        content:
          'You are a local personal finance advisor. Explain the provided computed metrics and suggest concrete actions. Do not invent source numbers.',
      },
      {
        role: 'user',
        content: JSON.stringify(metrics),
      },
    ],
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        topActions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              impactEstimate: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['title', 'impactEstimate', 'reason'],
            additionalProperties: false,
          },
        },
        riskFlags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['summary', 'topActions', 'riskFlags'],
      additionalProperties: false,
    },
    temperature: 0.2,
  });

  return {
    promptVersion: ADVISOR_PROMPT_VERSION,
    response: payload,
  };
}

export async function requestOllamaSavingsChat({
  metrics,
  messages,
}: {
  metrics: object;
  messages: SavingsAdvisorChatMessage[];
}) {
  const { model } = getOllamaConfig();
  const reply = await requestText({
    messages: [
      {
        role: 'system',
        content:
          'You are a local personal finance advisor inside Enough. Answer from the provided aggregate metrics and conversation only. Do not invent source numbers. Do not claim access to raw transactions, account identifiers, Plaid data, category row details, or payee names. If detail is unavailable, say that and suggest what aggregate signal to review.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          aggregateMetrics: metrics,
          privacyBoundary:
            'Only aggregate computed metrics are provided. Raw transactions, account identifiers, category row details, Plaid data, and payee names are intentionally unavailable.',
        }),
      },
      ...messages,
    ],
    temperature: 0.2,
  });

  return {
    model,
    promptVersion: ADVISOR_CHAT_PROMPT_VERSION,
    reply,
  } as const;
}
