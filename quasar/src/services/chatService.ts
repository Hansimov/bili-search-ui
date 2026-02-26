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
    content: string;
}

/** Tool call details - includes request args and results */
export interface ToolCall {
    type: string;          // tool name: 'search_videos' | 'check_author'
    args: Record<string, unknown>;  // tool arguments
    status: 'pending' | 'completed';
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
        };
        finish_reason: string | null;
    }>;
    usage?: Usage;
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
    /** Called when a tool event is received */
    onToolEvent?: (event: ToolEvent) => void;
    /** Called when streaming completes */
    onDone?: (perfStats?: PerfStats, usage?: Usage) => void;
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

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // SSE format: "data: ..." or "data:..."
                let dataStr = '';
                if (trimmed.startsWith('data: ')) {
                    dataStr = trimmed.slice(6);
                } else if (trimmed.startsWith('data:')) {
                    dataStr = trimmed.slice(5);
                } else {
                    continue;
                }

                if (dataStr === '[DONE]') {
                    return;
                }

                try {
                    const parsed = JSON.parse(dataStr);

                    // 检测后端错误事件（tool loop 或 LLM 阶段的错误）
                    if (parsed.error) {
                        callbacks.onError?.(new Error(parsed.error));
                        return;
                    }

                    // Stream ID event (first event from backend, for explicit abort)
                    if (parsed.stream_id && !parsed.choices) {
                        callbacks.onStreamId?.(parsed.stream_id);
                        continue;
                    }

                    const chunk = parsed as ChatStreamChunk;
                    const choice = chunk.choices?.[0];
                    if (!choice) continue;

                    const delta = choice.delta;

                    // First chunk with role — signal start
                    if (delta.role === 'assistant') {
                        callbacks.onStart?.(chunk);
                    }

                    // Reasoning/thinking content delta
                    if (delta.reasoning_content) {
                        callbacks.onThinking?.(delta.reasoning_content);
                    }

                    // Content delta
                    if (delta.content) {
                        callbacks.onContent?.(delta.content);
                    }

                    // Tool events — yield individually
                    if (chunk.tool_events) {
                        for (const event of chunk.tool_events) {
                            callbacks.onToolEvent?.(event);
                        }
                    }

                    // Final chunk with finish_reason
                    if (choice.finish_reason === 'stop') {
                        callbacks.onDone?.(
                            chunk.perf_stats,
                            chunk.usage
                        );
                    }
                } catch {
                    // Skip malformed JSON chunks
                    continue;
                }
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
        tool_events: data.tool_events,
        thinking: data.thinking,
    };
}
