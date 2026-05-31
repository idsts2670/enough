import { fetch } from '#platform/server/fetch';

import type {
  CategorySuggestionResult,
  SavingsAdvisorChatMessage,
  SavingsAdvisorResponse,
} from './types';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:8b';
const CATEGORY_PROMPT_VERSION = 'category-v1';
const ADVISOR_PROMPT_VERSION = 'advisor-v1';
const ADVISOR_CHAT_PROMPT_VERSION = 'advisor-chat-v2';

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
        think: false,
        stream: false,
        format: schema,
        options: {
          temperature,
          num_predict: 700,
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
    .replace(/^[\s\S]*?<\/think>/i, '')
    .replace(/^\s+/, '')
    .trim();
}

function isMetaSavingsChatReply(content: string) {
  return /^(okay|let's|first,?\s+i|i need|let me|we are given|we need|the user|looking at|based on the prompt|advisor facts|finalquestion|the main sections|the user's question|wait,)/i.test(
    content,
  );
}

async function requestText({
  messages,
  temperature = 0.2,
  timeoutMs = 60_000,
}: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const { baseUrl, model } = getOllamaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        think: false,
        stream: false,
        options: {
          temperature,
          num_predict: 512,
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
  } finally {
    clearTimeout(timeout);
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
  const { model } = getOllamaConfig();
  const payload = await requestJson<SavingsAdvisorResponse>({
    messages: [
      {
        role: 'system',
        content:
          '/no_think\nYou are a local personal finance advisor. Return product-ready copy for a dashboard card. Write the summary in second person, maximum two short sentences. Do not write phrases like "the user", "financial metrics", "provided data", or "aggregate metrics". Suggest concrete actions. Do not invent source numbers. Use currentDate, currentMonth, month, and selectedMonthStatus exactly as provided. Never call the selected month a future date unless selectedMonthStatus is "future". If monthIncome or monthExpenses is above zero, never describe the profile as empty or say no transactions have been processed.',
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
    model,
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
  const recentMessages = messages.slice(-8);
  const userQuestion = messages.at(-1)?.content ?? '';
  const systemPrompt =
    '/no_think\nYou are a local personal finance advisor inside Enough. Answer the final user question directly from the advisor facts payload. Return only the final answer. Do not narrate your reasoning, mention prompts, mention provided data, or say "the user". Do not start with phrases like "Okay", "Let me", "First", or "I need". Do not invent source numbers. Use currentDate, currentMonth, month, and selectedMonthStatus exactly as provided. Use topSpendingCategories for largest, biggest, highest, or top spending-category questions. Use topSpendingGroups for group, bucket, or high-level category questions. Use spendingGroupBreakdowns for questions asking what categories or items are inside a group or bucket. Use allocationAnalysis for 30/30/40, allocation-rule, target-vs-actual, over-target, under-target, and improvement questions. Use topSpendingPayees as merchant/payee drivers when the user asks about habits, where to improve, where to save more, or why a category is high. Never call the selected month a future date unless selectedMonthStatus is "future". Prefer 2-5 concise bullets for advice. Tie each recommendation to a category, budget variance, group, or payee driver. Raw transaction rows, account identifiers, Plaid payloads, notes, and transaction IDs are unavailable; do not claim you inspected them.';
  const advisorPayload = JSON.stringify({
    advisorFacts: metrics,
    recentConversation: recentMessages,
    finalQuestion: userQuestion,
    privacyBoundary:
      'This is a local Ollama chat. You receive computed month metrics, category/group rankings, budget targets, allocation analysis, and aggregate payee/merchant drivers. Raw transaction rows, account identifiers, notes, transaction IDs, and Plaid payloads are not provided.',
  });
  const messagesForModel: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `${advisorPayload}\n\nAnswer finalQuestion now. Do not explain the prompt. Do not say the facts are missing unless advisorFacts is empty.\n/no_think`,
    },
  ];
  let reply = await requestText({
    messages: messagesForModel,
    temperature: 0.35,
    timeoutMs: 45_000,
  });

  if (reply && isMetaSavingsChatReply(reply)) {
    reply = await requestText({
      messages: [
        ...messagesForModel,
        {
          role: 'assistant',
          content: reply,
        },
        {
          role: 'user',
          content:
            'Rewrite your previous response as the final answer only. Use the advisorFacts payload. Give 2-5 concise bullets. Do not mention prompts, instructions, missing facts, or reasoning. Do not use preamble. Start with the strongest recommendation.\n/no_think',
        },
      ],
      temperature: 0.2,
      timeoutMs: 30_000,
    });
  }

  if (reply && isMetaSavingsChatReply(reply)) {
    reply = null;
  }

  return {
    model,
    promptVersion: ADVISOR_CHAT_PROMPT_VERSION,
    reply,
  } as const;
}
