import "./runtime.js";

// Llama 3.3 was retired for developer accounts. Keep the replacement configurable
// so a future provider migration does not require editing every AI controller.
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
export function groqCompletionOptions({ temperature = 0.5, maxTokens = 350 } = {}) {
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  const reasoning = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"].includes(model);
  return { model, temperature, max_completion_tokens: reasoning ? Math.max(1500, maxTokens) : maxTokens,
    ...(reasoning ? { reasoning_effort: "low", include_reasoning: false } : {}) };
}
