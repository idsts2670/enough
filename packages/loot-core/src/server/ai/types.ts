export type AiSuggestionSource =
  | 'rule'
  | 'plaid'
  | 'history'
  | 'ollama'
  | 'manual_feedback';

export type AiSuggestionStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'auto_applied'
  | 'superseded';

export type AiCategorySuggestion = {
  id: string;
  transactionId: string;
  normalizedPayee: string | null;
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  source: AiSuggestionSource;
  reason: string | null;
  suggestedRule: string | null;
  shouldAutoApply: boolean;
  status: AiSuggestionStatus;
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
  appliedAt: string | null;
};

export type CategorySuggestionResult = Pick<
  AiCategorySuggestion,
  'categoryId' | 'confidence' | 'reason' | 'shouldAutoApply' | 'suggestedRule'
> & {
  source: AiSuggestionSource;
  normalizedPayee: string | null;
  model?: string | null;
  promptVersion?: string | null;
};

export type SavingsAdvisorAction = {
  title: string;
  impactEstimate: string;
  reason: string;
};

export type SavingsAdvisorResponse = {
  summary: string;
  topActions: SavingsAdvisorAction[];
  riskFlags: string[];
};

export type SavingsAdvisorChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SavingsAdvisorChatError = 'unavailable' | 'invalid_messages';

export type SavingsAdvisorChatSource = 'deterministic' | 'ollama' | 'fallback';

export type SavingsAdvisorChatAllocation = {
  monthlyIncome: number;
  buckets: Array<{
    groupId: string;
    groupName: string;
    percent: number;
  }>;
};

export type SavingsAdvisorChatResponse = {
  reply: string | null;
  model: string;
  promptVersion: 'advisor-chat-v2';
  source: SavingsAdvisorChatSource;
  error?: SavingsAdvisorChatError;
};
