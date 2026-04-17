/**
 * ChatService - SSE streaming client for LLM chat completions.
 *
 * Connects to the backend /api/chat/completions endpoint and handles:
 * - SSE streaming response parsing
 * - Abort control for cancellation
 * - Callback-based content delivery for reactive UI updates
 *
 * Supports two modes via the `thinking` parameter:
 * - false: 快速问答 (quick Q&A)
 * - true:  智能思考 (deep thinking with more tool iterations)
 */

/** A single chat message in OpenAI format */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<Record<string, unknown>>;
}

/** Tool call details - includes request args and results */
export interface ToolCall {
    type: string;          // tool name: 'search_videos' | 'check_author'
    args: Record<string, unknown>;  // tool arguments
    status: 'pending' | 'completed';
    visibility?: 'user' | 'internal';
    result_id?: string;
    summary?: unknown;
    result?: unknown;      // tool result (only when status === 'completed')
}

/** Tool event from backend (which tools were called per iteration) */
export interface ToolEvent {
    iteration: number;
    tools: string[];       // legacy: tool names array
    calls?: ToolCall[];    // new: detailed tool calls with args and results
}

/** Performance stats from the backend (timing/rate metrics only) */
export interface PerfStats {
    tokens_per_second: number;
    total_elapsed: string;
    total_elapsed_ms: number;
}

/** Token usage statistics from the backend */
export interface Usage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    reasoning_tokens?: number;
}

export interface UsageTraceModel {
    config: string;
    model: string;
    reason?: string;
    factors?: string[];
}

export interface UsageTraceIteration {
    phase: string;
    iteration: number;
    model_config: string;
    model_name: string;
    model_reason?: string;
    model_factors?: string[];
    tool_count?: number;
    tool_names?: string[];
}

export interface UsageTrace {
    intent?: {
        route_reason?: string;
        prefers_transcript_lookup?: boolean;
        [key: string]: unknown;
    };
    models?: {
        planner?: UsageTraceModel;
        response?: UsageTraceModel;
        delegate?: UsageTraceModel;
    };
    iterations?: UsageTraceIteration[];
    [key: string]: unknown;
}

/** Parsed SSE chunk from the streaming response */
export interface ChatStreamChunk {
    id: string;
    object: string;
    choices: Array<{
        index: number;
        delta: {
            role?: string;
            content?: string;
            reasoning_content?: string;
            /** When true, the frontend should reset the aggregated thinking text
             *  because a new orchestration phase has started. */
            reset_reasoning?: boolean;
            /** Optional backend-provided phase label for reasoning reset events. */
            reasoning_phase?: string;
            /** When true, the frontend should discard streamed content because
             *  it was analysis text from a tool-calling iteration and belongs
             *  in the thinking section (which will receive it shortly after as
             *  a reasoning_content event). */
            retract_content?: boolean;
        };
        finish_reason: string | null;
    }>;
    usage?: Usage;
    usage_trace?: UsageTrace;
    perf_stats?: PerfStats;
    tool_events?: ToolEvent[];
    thinking?: boolean;
}

/** Callbacks for streaming response handling */
export interface ChatStreamCallbacks {
    /** Called when the backend sends the stream_id (for explicit abort) */
    onStreamId?: (streamId: string) => void;
    /** Called when streaming starts (first chunk with role) */
    onStart?: (chunk: ChatStreamChunk) => void;
    /** Called for each content delta */
    onContent?: (content: string) => void;
    /** Called for each reasoning/thinking content delta */
    onThinking?: (content: string) => void;
    /** Called when the backend starts a new reasoning phase */
    onResetThinking?: (phase?: string) => void;
    /** Called when the backend retracts previously streamed content (because
     *  the streamed text was analysis for a tool-calling iteration, not the
     *  final answer).  The frontend should clear the content area. */
    onRetractContent?: () => void;
    /** Called when a tool event is received */
    onToolEvent?: (event: ToolEvent) => void;
    /** Called when streaming completes */
    onDone?: (
        perfStats?: PerfStats,
        usage?: Usage,
        usageTrace?: UsageTrace,
    ) => void;
    /** Called on error */
    onError?: (error: Error) => void;
}

/** Request parameters for chat completion */
export interface ChatCompletionParams {
    messages: ChatMessage[];
    thinking?: boolean;
    max_iterations?: number;
    temperature?: number;
}

const ANSWER_VISIBLE_GRACE_MS = 400;

/**
 * Send a streaming chat completion request via SSE.
 *
 * Uses fetch() with ReadableStream to parse SSE events in real-time,
 * calling the provided callbacks as content arrives.
 *
 * @param params - Chat completion parameters
 * @param callbacks - Event callbacks for streaming updates
 * @param abortSignal - Optional AbortSignal for cancellation
 */
export async function chatCompletionStream(
    params: ChatCompletionParams,
    callbacks: ChatStreamCallbacks,
    abortSignal?: AbortSignal
): Promise<void> {
    const body = {
        messages: params.messages,
        stream: true,
        thinking: params.thinking || false,
        ...(params.max_iterations != null && {
            max_iterations: params.max_iterations,
        }),
        ...(params.temperature != null && { temperature: params.temperature }),
    };

    let response: Response;
    try {
        response = await fetch('/api/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: abortSignal,
        });
    } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        callbacks.onError?.(error as Error);
        return;
    }

    if (!response.ok) {
        callbacks.onError?.(
            new Error(`Chat API error: ${response.status} ${response.statusText}`)
        );
        return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
        callbacks.onError?.(new Error('No response body'));
        return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let hasYieldedFirstContent = false;
    let hasDeliveredAnswerContent = false;

    const yieldToUi = async (): Promise<void> => {
        await new Promise<void>((resolve) => {
            if (
                typeof window !== 'undefined' &&
                typeof window.requestAnimationFrame === 'function'
            ) {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => resolve());
                });
                return;
            }
            setTimeout(resolve, 0);
        });
    };

    const allowAnswerToSettle = async (): Promise<void> => {
        await yieldToUi();
        await new Promise<void>((resolve) => {
            setTimeout(resolve, ANSWER_VISIBLE_GRACE_MS);
        });
    };

    const processEvent = (rawEvent: string): {
        shouldStop: boolean;
        deliveredContent: boolean;
        shouldYieldToUi: boolean;
        pendingDone?: {
            perfStats?: PerfStats;
            usage?: Usage;
            usageTrace?: UsageTrace;
        };
    } => {
        const lines = rawEvent
            .split('\n')
            .map((line) => line.replace(/\r$/, ''));

        const dataLines: string[] = [];
        for (const line of lines) {
            if (!line || line.startsWith(':')) continue;
            if (line.startsWith('data: ')) {
                dataLines.push(line.slice(6));
            } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5));
            }
        }

        if (dataLines.length === 0) {
            return {
                shouldStop: false,
                deliveredContent: false,
                shouldYieldToUi: false,
                pendingDone: undefined,
            };
        }

        const dataStr = dataLines.join('\n').trim();
        if (!dataStr) {
            return {
                shouldStop: false,
                deliveredContent: false,
                shouldYieldToUi: false,
                pendingDone: undefined,
            };
        }

        if (dataStr === '[DONE]') {
            return {
                shouldStop: true,
                deliveredContent: false,
                shouldYieldToUi: false,
                pendingDone: undefined,
            };
        }

        let deliveredContent = false;
        let shouldYieldToUi = false;
        let pendingDone:
            | {
                perfStats?: PerfStats;
                usage?: Usage;
                usageTrace?: UsageTrace;
            }
            | undefined;

        try {
            const parsed = JSON.parse(dataStr);

            if (parsed.error) {
                callbacks.onError?.(new Error(parsed.error));
                return {
                    shouldStop: true,
                    deliveredContent: false,
                    shouldYieldToUi: false,
                    pendingDone: undefined,
                };
            }

            if (parsed.stream_id && !parsed.choices) {
                callbacks.onStreamId?.(parsed.stream_id);
                return {
                    shouldStop: false,
                    deliveredContent: false,
                    shouldYieldToUi: false,
                    pendingDone: undefined,
                };
            }

            const chunk = parsed as ChatStreamChunk;
            const choice = chunk.choices?.[0];
            if (!choice) {
                return {
                    shouldStop: false,
                    deliveredContent: false,
                    shouldYieldToUi: false,
                    pendingDone: undefined,
                };
            }

            const delta = choice.delta;

            if (delta.role === 'assistant') {
                callbacks.onStart?.(chunk);
            }

            if (delta.retract_content) {
                callbacks.onRetractContent?.();
                return {
                    shouldStop: false,
                    deliveredContent: false,
                    shouldYieldToUi: false,
                    pendingDone: undefined,
                };
            }

            if (delta.reset_reasoning) {
                callbacks.onResetThinking?.(delta.reasoning_phase);
            }

            if (delta.reasoning_content) {
                callbacks.onThinking?.(delta.reasoning_content);
            }

            if (delta.content) {
                callbacks.onContent?.(delta.content);
                deliveredContent = true;
                hasDeliveredAnswerContent = true;
                if (!hasYieldedFirstContent) {
                    shouldYieldToUi = true;
                    hasYieldedFirstContent = true;
                }
            }

            if (chunk.tool_events) {
                for (const event of chunk.tool_events) {
                    callbacks.onToolEvent?.(event);
                }
            }

            if (choice.finish_reason === 'stop') {
                pendingDone = {
                    perfStats: chunk.perf_stats,
                    usage: chunk.usage,
                    usageTrace: chunk.usage_trace,
                };
            }
        } catch {
            // Skip malformed JSON chunks
        }

        return {
            shouldStop: false,
            deliveredContent,
            shouldYieldToUi,
            pendingDone,
        };
    };

    const processBufferedEvents = async (flush = false): Promise<boolean> => {
        buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex >= 0) {
            const rawEvent = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);
            const result = processEvent(rawEvent);
            if (result.shouldStop) {
                return true;
            }
            if (result.shouldYieldToUi) {
                await yieldToUi();
            }
            if (result.pendingDone) {
                if (hasDeliveredAnswerContent) {
                    await allowAnswerToSettle();
                }
                callbacks.onDone?.(
                    result.pendingDone.perfStats,
                    result.pendingDone.usage,
                    result.pendingDone.usageTrace,
                );
            }
            separatorIndex = buffer.indexOf('\n\n');
        }

        if (flush && buffer.trim()) {
            const rawEvent = buffer;
            buffer = '';
            const result = processEvent(rawEvent);
            if (result.shouldYieldToUi) {
                await yieldToUi();
            }
            if (result.pendingDone) {
                if (hasDeliveredAnswerContent) {
                    await allowAnswerToSettle();
                }
                callbacks.onDone?.(
                    result.pendingDone.perfStats,
                    result.pendingDone.usage,
                    result.pendingDone.usageTrace,
                );
            }
            if (result.shouldStop) {
                return true;
            }
        }

        return false;
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                await processBufferedEvents(true);
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            if (await processBufferedEvents()) {
                return;
            }
        }
    } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        callbacks.onError?.(error as Error);
    } finally {
        reader.releaseLock();
    }
}

/**
 * Send a non-streaming chat completion request.
 *
 * @param params - Chat completion parameters
 * @param abortSignal - Optional AbortSignal for cancellation
 * @returns The complete chat completion response
 */
export async function chatCompletion(
    params: ChatCompletionParams,
    abortSignal?: AbortSignal
): Promise<{
    content: string;
    perf_stats?: PerfStats;
    usage?: Usage;
    usage_trace?: UsageTrace;
    tool_events?: ToolEvent[];
    thinking?: boolean;
}> {
    const body = {
        messages: params.messages,
        stream: false,
        thinking: params.thinking || false,
        ...(params.max_iterations != null && {
            max_iterations: params.max_iterations,
        }),
        ...(params.temperature != null && { temperature: params.temperature }),
    };

    const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortSignal,
    });

    if (!response.ok) {
        throw new Error(
            `Chat API error: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();
    return {
        content: data.choices?.[0]?.message?.content || '',
        perf_stats: data.perf_stats,
        usage: data.usage,
        usage_trace: data.usage_trace,
        tool_events: data.tool_events,
        thinking: data.thinking,
    };
}
