import { createApp } from '#server/app';
import { mutator } from '#server/mutators';

import {
  acceptCategorySuggestion,
  getCategorySuggestions,
  rejectCategorySuggestion,
  runCategorySuggestions,
} from './category-suggestions';
import { checkOllamaStatus, getOllamaConfig } from './ollama-client';
import { getSavingsAdvisor } from './savings-advisor';

async function handleGetOllamaConfig() {
  return getOllamaConfig();
}

export type AiHandlers = {
  'ai/ollama-config': typeof handleGetOllamaConfig;
  'ai/ollama-status': typeof checkOllamaStatus;
  'ai/category-suggestions-run': typeof runCategorySuggestions;
  'ai/category-suggestions-get': typeof getCategorySuggestions;
  'ai/category-suggestion-accept': typeof acceptCategorySuggestion;
  'ai/category-suggestion-reject': typeof rejectCategorySuggestion;
  'ai/savings-advisor': typeof getSavingsAdvisor;
};

export const app = createApp<AiHandlers>();

app.method('ai/ollama-config', handleGetOllamaConfig);
app.method('ai/ollama-status', checkOllamaStatus);
app.method('ai/category-suggestions-run', mutator(runCategorySuggestions));
app.method('ai/category-suggestions-get', getCategorySuggestions);
app.method('ai/category-suggestion-accept', mutator(acceptCategorySuggestion));
app.method('ai/category-suggestion-reject', mutator(rejectCategorySuggestion));
app.method('ai/savings-advisor', getSavingsAdvisor);
