/**
 * Fake replacement for the `@ai-sdk/openai` module. OpenAI is an external, paid,
 * nondeterministic dependency, so tests swap the provider (never our own services)
 * for an in-process model that returns scripted text and records every prompt.
 *
 * isolatedDatabase.ts installs this module in place of `@ai-sdk/openai` for every
 * test file, so no test can reach the real API. Usage in a test file:
 *
 *   vi.hoisted(() => { process.env.OPENAI_API_KEY = 'test-key'; }); // enable AI paths
 *   import { fakeOpenAi } from './support/fakeOpenAi';
 *
 *   beforeEach(() => fakeOpenAi.reset());
 *   fakeOpenAi.replyWith('Line 1 title\n\nBody');            // every call
 *   fakeOpenAi.replyWith((prompt) => prompt.includes('x') ? 'a' : 'b');
 *   fakeOpenAi.failWith(new Error('rate limited'));
 *   expect(fakeOpenAi.prompts[0]).toContain('...');
 */
import { MockLanguageModelV3 } from 'ai/test';

type Responder = (prompt: string) => string;

interface FakeOpenAiState {
  responder: Responder;
  failure: Error | null;
  prompts: string[];
}

const state: FakeOpenAiState = {
  responder: () => 'Fake AI response',
  failure: null,
  prompts: [],
};

function promptText(options: { prompt: unknown }): string {
  // The SDK passes a message list; flatten every text part into one string.
  const messages = options.prompt as Array<{ content: unknown }>;
  return messages
    .flatMap((message) =>
      typeof message.content === 'string'
        ? [message.content]
        : (message.content as Array<{ type: string; text?: string }>)
            .filter((part) => part.type === 'text')
            .map((part) => part.text ?? '')
    )
    .join('\n');
}

export const fakeOpenAi = {
  /** Prompts received, in call order. */
  get prompts(): readonly string[] {
    return state.prompts;
  },
  replyWith(reply: string | Responder) {
    state.failure = null;
    state.responder = typeof reply === 'string' ? () => reply : reply;
  },
  failWith(error: Error) {
    state.failure = error;
  },
  reset() {
    state.responder = () => 'Fake AI response';
    state.failure = null;
    state.prompts = [];
  },
};

/** Drop-in for `openai(modelId)` from `@ai-sdk/openai`. */
export function openai(modelId: string) {
  return new MockLanguageModelV3({
    provider: 'fake-openai',
    modelId,
    doGenerate: async (options) => {
      const prompt = promptText(options);
      state.prompts.push(prompt);
      if (state.failure) throw state.failure;
      return {
        content: [{ type: 'text', text: state.responder(prompt) }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 10, text: 10, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
}
