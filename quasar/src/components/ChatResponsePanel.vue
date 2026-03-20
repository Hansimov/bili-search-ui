<template>
  <div
    ref="panelRef"
    class="chat-response-panel"
    :class="{ 'chat-thinking': isThinking }"
  >
    <!-- Video hover tooltip -->
    <BiliVideoTooltip
      :videoInfo="tooltipVideoInfo"
      :visible="tooltipVisible"
      :anchorRect="tooltipAnchorRect"
      :containerRect="tooltipContainerRect"
      @tooltip-enter="onTooltipEnter"
      @tooltip-leave="onTooltipLeave"
      @tooltip-wheel="onTooltipWheel"
    />
    <!-- 多轮对话：历史消息 -->
    <template v-for="msg in historyMessages" :key="msg.id">
      <!-- 用户消息 -->
      <div v-if="msg.role === 'user'" class="chat-user-query">
        <span class="user-query-text">{{ msg.content }}</span>
      </div>
      <!-- 助手消息（历史） -->
      <div v-else-if="msg.role === 'assistant'" class="chat-history-assistant">
        <!-- 历史思考过程+工具调用（按时间线交替渲染） -->
        <div v-if="hasHistoryThinking(msg)" class="chat-thinking-section">
          <div
            class="chat-thinking-header"
            @click="toggleHistoryThinking(msg.id)"
          >
            <q-icon
              :name="
                isHistoryThinkingExpanded(msg.id)
                  ? 'expand_less'
                  : 'expand_more'
              "
              size="18px"
              class="thinking-expand-icon"
            />
            <span class="thinking-header-text">思考过程</span>
          </div>
          <div
            class="chat-thinking-collapse-wrapper"
            :class="{ expanded: isHistoryThinkingExpanded(msg.id) }"
          >
            <div class="chat-thinking-collapse-inner">
              <template
                v-if="msg.streamSegments && msg.streamSegments.length > 0"
              >
                <template v-for="(seg, sIdx) in msg.streamSegments" :key="sIdx">
                  <div
                    v-if="seg.type === 'thinking' && seg.content"
                    class="chat-thinking-content"
                  >
                    <div
                      v-html="renderMd(seg.content.replace(/\\n+$/, ''))"
                    ></div>
                  </div>
                  <ToolCallDisplay
                    v-if="
                      seg.type === 'tool' && getSegmentToolCalls(seg).length > 0
                    "
                    :toolCalls="getSegmentToolCalls(seg)"
                    isHistorical
                    @viewAllResults="handleViewHistoricalResults"
                    class="thinking-inline-tools"
                  />
                </template>
              </template>
              <template v-else>
                <div v-if="msg.thinkingContent" class="chat-thinking-content">
                  <div
                    v-html="renderMd(msg.thinkingContent.replace(/\\n+$/, ''))"
                  ></div>
                </div>
              </template>
            </div>
          </div>
        </div>
        <!-- 历史工具调用：仅在没有 streamSegments 时 fallback 显示 -->
        <ToolCallDisplay
          v-if="!msg.streamSegments && getHistoryToolCalls(msg).length > 0"
          :toolCalls="getHistoryToolCalls(msg)"
          isHistorical
          @viewAllResults="handleViewHistoricalResults"
        />
        <div
          class="chat-content markdown-body"
          v-html="renderMd(msg.content)"
        ></div>

        <!-- 历史消息的性能统计 -->
        <div v-if="getHistoryPerfStats(msg)" class="chat-perf-stats">
          <span class="perf-text">{{ getHistoryPerfStats(msg) }}</span>
        </div>
      </div>
    </template>

    <!-- 当前回合：用户提问 -->
    <div v-if="userQuery" class="chat-user-query">
      <span class="user-query-text">{{ userQuery }}</span>
    </div>

    <!-- 加载状态：等待 LLM 响应（小巧提示，左对齐） -->
    <div
      v-if="
        isLoading &&
        !hasContent &&
        !hasThinkingContent &&
        toolEvents.length === 0
      "
      class="chat-loading"
    >
      <div class="chat-loading-indicator">
        <q-spinner-dots size="16px" :color="modeColor" />
        <span class="chat-loading-text">{{ loadingText }}</span>
      </div>
    </div>

    <!-- 当前回合：思考过程+工具调用（按 streamSegments 时间线交替渲染） -->
    <div
      v-if="hasThinkingContent || allToolCalls.length > 0"
      class="chat-thinking-section"
    >
      <!-- 折叠头 -->
      <div
        class="chat-thinking-header"
        @click="thinkingExpanded = !thinkingExpanded"
      >
        <q-icon
          :name="thinkingExpanded ? 'expand_less' : 'expand_more'"
          size="18px"
          class="thinking-expand-icon"
        />
        <span class="thinking-header-text">{{ thinkingHeaderLabel }}</span>
        <span v-if="isThinkingPhase" class="thinking-active-indicator">
          <span class="thinking-header-text">思考中</span>
          <span class="thinking-dots"
            ><span>.</span><span>.</span><span>.</span></span
          >
        </span>
      </div>
      <!-- 可折叠内容：按时间线渲染 thinking 文本 + tool calls -->
      <div
        class="chat-thinking-collapse-wrapper"
        :class="{ expanded: thinkingExpanded }"
      >
        <div class="chat-thinking-collapse-inner">
          <template v-for="(seg, sIdx) in currentStreamSegments" :key="sIdx">
            <!-- 思考文本片段 -->
            <div
              v-if="seg.type === 'thinking' && seg.content"
              class="chat-thinking-content"
            >
              <div v-html="renderSegmentThinking(seg.content, sIdx)"></div>
              <!-- 最后一个 thinking 片段 + 正在思考 + 无工具调用：显示光标 -->
              <span
                v-if="
                  isLastThinkingSegment(sIdx) &&
                  isThinkingPhase &&
                  allToolCalls.length === 0
                "
                class="chat-cursor thinking-cursor"
                >▊</span
              >
            </div>
            <!-- 工具调用片段 -->
            <ToolCallDisplay
              v-if="seg.type === 'tool' && getSegmentToolCalls(seg).length > 0"
              :toolCalls="getSegmentToolCalls(seg)"
              :isAborted="isAborted"
              @viewAllResults="handleViewCurrentResults"
              class="thinking-inline-tools"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- 流式光标（工具调用完成后、内容生成前，显示在工具调用下方） -->
    <span
      v-if="isLoading && !hasContent && allToolCalls.length > 0"
      class="chat-cursor tool-after-cursor"
      >▊</span
    >

    <!-- Markdown 内容渲染 -->
    <div
      v-if="hasContent"
      class="chat-content markdown-body"
      v-html="renderedContent"
    ></div>

    <!-- 流式光标（正在生成回答内容时显示） -->
    <span v-if="isLoading && hasContent && !isThinkingPhase" class="chat-cursor"
      >▊</span
    >
    <!-- 中止提示 -->
    <div v-if="isAborted" class="chat-aborted">
      <q-icon name="stop_circle" size="15px" />
      <span class="chat-aborted-text">已中止生成</span>
    </div>
    <!-- 性能统计 -->
    <div v-if="isDone && perfStats" class="chat-perf-stats">
      <span class="perf-text">{{ formattedPerfStats }}</span>
    </div>

    <!-- 错误信息 -->
    <div v-if="hasError" class="chat-error">
      <q-icon name="error_outline" size="16px" color="negative" />
      <span class="chat-error-text">{{ errorMessage }}</span>
      <q-btn
        flat
        dense
        size="sm"
        label="重试"
        color="primary"
        @click="$emit('retry')"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import {
  useChatStore,
  type ConversationMessage,
  type StreamSegment,
} from 'src/stores/chatStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import type {
  ToolEvent,
  ToolCall,
  PerfStats,
  Usage,
} from 'src/services/chatService';
import { renderMarkdown } from 'src/utils/markdown';
import { normalizeVideoHit } from 'src/utils/videoHit';
import ToolCallDisplay from './ToolCallDisplay.vue';
import BiliVideoTooltip from './BiliVideoTooltip.vue';

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  check_author: '查询作者',
  read_spec: '阅读文档',
};

export default defineComponent({
  name: 'ChatResponsePanel',
  components: {
    ToolCallDisplay,
    BiliVideoTooltip,
  },
  emits: ['retry', 'showResults'],
  setup(_props, { emit }) {
    const chatStore = useChatStore();
    const searchModeStore = useSearchModeStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();

    const thinkingExpanded = ref(true);

    const isLoading = computed(() => chatStore.isLoading);
    const hasContent = computed(() => chatStore.hasContent);
    const hasThinkingContent = computed(() => chatStore.hasThinkingContent);
    const isThinkingPhase = computed(() => chatStore.isThinkingPhase);
    const isDone = computed(() => chatStore.isDone);
    const isAborted = computed(() => chatStore.isAborted);
    const hasError = computed(() => chatStore.hasError);
    const perfStats = computed(() => chatStore.perfStats);
    const usage = computed(() => chatStore.usage);
    const toolEvents = computed(() => chatStore.toolEvents);
    const isThinking = computed(() => chatStore.currentSession.thinking);
    const errorMessage = computed(
      () => chatStore.currentSession.error || '请求失败'
    );
    const userQuery = computed(() => chatStore.currentSession.query || '');

    /**
     * 从所有 tool events 中提取扁平的 tool calls 列表。
     * 使用 type+args 去重：当多次 iteration 调用同一工具（相同参数）时，
     * 只保留最新的版本（后面 iteration 的覆盖前面的），避免出现重复的 tool-call-item。
     */
    const allToolCalls = computed((): ToolCall[] => {
      const callMap = new Map<string, ToolCall>();
      for (const event of toolEvents.value) {
        if (event.calls && event.calls.length > 0) {
          for (const call of event.calls) {
            const key = `${call.type}:${JSON.stringify(call.args)}`;
            callMap.set(key, call);
          }
        }
      }
      return Array.from(callMap.values());
    });

    /**
     * 多轮对话历史（不含当前回合）
     * 使用 chatStore.historyMessages getter，基于 _conversationLengthBeforeCurrentRound 分离
     * 避免内容匹配启发式导致的闪烁和 key 变化时的 instance.update 错误
     */
    const historyMessages = computed(() => chatStore.historyMessages);

    const modeColor = computed(() => {
      const mode = searchModeStore.currentMode;
      if (mode === 'think') return 'purple-5';
      return 'teal-5';
    });

    const loadingText = computed(() => {
      return '思考中';
    });

    /** 思考标题：思考中时不显示 "思考过程"，完成后才显示 */
    const thinkingHeaderLabel = computed(() => {
      if (isThinkingPhase.value) return '';
      return '思考过程';
    });

    /** 渲染 Markdown 内容为 HTML */
    const renderedContent = computed(() => {
      const raw = chatStore.content;
      if (!raw) return '';
      return renderMarkdown(raw);
    });

    /** 渲染思考内容为 HTML（去除末尾空行） */
    const renderedThinkingContent = computed(() => {
      let raw = chatStore.thinkingContent;
      if (!raw) return '';
      // 去除末尾空行
      raw = raw.replace(/\n+$/, '');
      return renderMarkdown(raw);
    });

    /** 格式化性能统计为完整字符串 */
    const formattedPerfStats = computed(() => {
      const ps = perfStats.value;
      const u = usage.value;
      if (!ps) return '';
      return formatPerfStatsString(ps, u);
    });

    /** 格式化 token 数量：超过 1000 显示为 XX.Xk */
    const formatTokenCount = (count: number): string => {
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
      }
      return String(count);
    };

    /** 格式化性能统计（可复用：当前会话 + 历史消息） */
    const formatPerfStatsString = (ps: PerfStats, u?: Usage | null) => {
      const totalMs = ps.total_elapsed_ms || 0;
      const parts: string[] = [];

      // 用时
      if (totalMs >= 60000) {
        const min = Math.floor(totalMs / 60000);
        const sec = Math.round((totalMs % 60000) / 1000);
        if (sec > 0) {
          parts.push(`用时 ${min} min ${sec}s`);
        } else {
          parts.push(`用时 ${min} min`);
        }
      } else {
        const sec = Math.round(totalMs / 1000);
        parts.push(`用时 ${sec}s`);
      }

      // 用量
      if (u?.prompt_tokens) {
        parts.push(`输入 ${formatTokenCount(u.prompt_tokens)} tokens`);
      }
      if (u?.completion_tokens) {
        parts.push(`输出 ${formatTokenCount(u.completion_tokens)} tokens`);
      }

      // 吞吐
      if (ps.tokens_per_second) {
        parts.push(`吞吐 ${ps.tokens_per_second} tokens/s`);
      }

      return parts.join(' · ');
    };

    /** 格式化工具事件显示 */
    const formatToolEvent = (event: ToolEvent): string => {
      const toolNames = event.tools.map((t) => TOOL_LABELS[t] || t).join('、');
      return toolNames;
    };

    /** 判断工具事件是否包含搜索类工具（可以查看结果） */
    const hasSearchTool = (event: ToolEvent): boolean => {
      return event.tools.some(
        (t) => t === 'search_videos' || t === 'check_author'
      );
    };

    /** 暴露 renderMarkdown 给模板用于历史消息渲染 */
    const renderMd = (text: string) => renderMarkdown(text);

    // ── StreamSegment helpers（当前回合 + 历史） ──

    /** 当前回合的 streamSegments（从 store 读取） */
    const currentStreamSegments = computed(() => chatStore.streamSegments);

    /** 渲染单个 thinking segment 的 markdown（去除末尾空行） */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const renderSegmentThinking = (content: string, _idx: number): string => {
      if (!content) return '';
      return renderMarkdown(content.replace(/\n+$/, ''));
    };

    /** 判断某个 segment 是否是当前轮最后一个 thinking segment */
    const isLastThinkingSegment = (idx: number): boolean => {
      const segs = currentStreamSegments.value;
      for (let i = segs.length - 1; i >= 0; i--) {
        if (segs[i].type === 'thinking') return i === idx;
      }
      return false;
    };

    /** 从单个 tool segment 中提取去重后的 ToolCall 列表 */
    const getSegmentToolCalls = (seg: StreamSegment): ToolCall[] => {
      if (!seg.toolEvent) return [];
      const ev = seg.toolEvent;
      if (!ev.calls || ev.calls.length === 0) return [];
      const callMap = new Map<string, ToolCall>();
      for (const call of ev.calls) {
        const key = `${call.type}:${JSON.stringify(call.args)}`;
        callMap.set(key, call);
      }
      return Array.from(callMap.values());
    };

    // ── 历史消息 thinking 展开/折叠 ──

    /** 每条历史消息的 thinking 展开状态（默认折叠） */
    const historyThinkingExpandedMap = reactive<Record<string, boolean>>({});

    /** 判断历史消息是否有思考内容可显示 */
    const hasHistoryThinking = (msg: ConversationMessage): boolean => {
      if (msg.streamSegments && msg.streamSegments.length > 0) {
        return msg.streamSegments.some(
          (s) => (s.type === 'thinking' && !!s.content) || s.type === 'tool'
        );
      }
      return !!msg.thinkingContent;
    };

    /** 切换历史消息 thinking 展开/折叠 */
    const toggleHistoryThinking = (msgId: string) => {
      historyThinkingExpandedMap[msgId] = !historyThinkingExpandedMap[msgId];
    };

    /** 查询历史消息 thinking 是否展开 */
    const isHistoryThinkingExpanded = (msgId: string): boolean => {
      return !!historyThinkingExpandedMap[msgId];
    };

    /** 从历史消息中提取扁平的 tool calls 列表（去重同 allToolCalls） */
    const getHistoryToolCalls = (msg: ConversationMessage): ToolCall[] => {
      if (!msg.toolEvents || msg.toolEvents.length === 0) return [];
      const callMap = new Map<string, ToolCall>();
      for (const event of msg.toolEvents) {
        if (event.calls && event.calls.length > 0) {
          for (const call of event.calls) {
            const key = `${call.type}:${JSON.stringify(call.args)}`;
            callMap.set(key, call);
          }
        }
      }
      return Array.from(callMap.values());
    };

    /** 获取历史消息的格式化性能统计 */
    const getHistoryPerfStats = (msg: ConversationMessage): string => {
      if (!msg.perfStats) return '';
      return formatPerfStatsString(msg.perfStats, msg.usage);
    };

    /** 查看历史消息中某个 tool call 的搜索结果 */
    const handleViewHistoricalResults = (call: ToolCall) => {
      syncToolCallToExploreStore(call);
      emit('showResults');
    };

    /** 查看当前会话中某个 tool call 的搜索结果 */
    const handleViewCurrentResults = (call: ToolCall) => {
      syncToolCallToExploreStore(call);
      emit('showResults');
    };

    /** 同步 tool call 的搜索结果到 exploreStore */
    const syncToolCallToExploreStore = (call: ToolCall) => {
      if (call.type === 'search_videos' && call.result) {
        const result = call.result as {
          hits?: unknown[];
          total_hits?: number;
          results?: Array<{ hits?: unknown[]; total_hits?: number }>;
        };
        let allHits: unknown[] = [];
        let totalHits = 0;

        // Single query format: {hits: [...]}
        if (result.hits && Array.isArray(result.hits)) {
          allHits = result.hits;
          totalHits = Number(result.total_hits || allHits.length);
        }
        // Multi-query format: {results: [{hits: [...]}, ...]}
        else if (result.results && Array.isArray(result.results)) {
          for (const r of result.results) {
            if (r.hits && Array.isArray(r.hits)) {
              allHits.push(...r.hits);
            }
            totalHits += Number(r.total_hits || r.hits?.length || 0);
          }
        }

        if (allHits.length > 0) {
          const normalizedHits = allHits.map((hit) =>
            normalizeVideoHit(hit as Record<string, unknown>)
          );
          exploreStore.updateLatestHitsResult({
            step: 0,
            name: 'search_videos',
            name_zh: '搜索视频',
            status: 'finished',
            input: {},
            output_type: 'hits',
            comment: '',
            output: {
              hits: normalizedHits,
              return_hits: normalizedHits.length,
              total_hits: totalHits || normalizedHits.length,
            },
          });
          // 确保分页状态正确，让 ResultsList 能显示第一页
          layoutStore.resetLoadedPages();
        }
      }
    };

    // ── Video tooltip (hover preview for BV links) ──

    interface VideoHit {
      bvid?: string;
      title?: string;
      pic?: string;
      duration?: number;
      owner?: { name?: string; mid?: number };
      stat?: { view?: number };
      pubdate?: number;
      region_name?: string;
      region_parent_name?: string;
      score?: number;
    }

    /** Build a bvid→videoInfo lookup from all tool call results */
    const videoMap = computed((): Map<string, VideoHit> => {
      const map = new Map<string, VideoHit>();
      // Current session tool events
      const events = [...toolEvents.value];
      // History tool events
      for (const msg of historyMessages.value) {
        if (msg.toolEvents) events.push(...msg.toolEvents);
      }
      for (const event of events) {
        if (!event.calls) continue;
        for (const call of event.calls) {
          if (call.type !== 'search_videos' || !call.result) continue;
          const result = call.result as {
            hits?: VideoHit[];
            results?: Array<{ hits?: VideoHit[] }>;
          };
          const hitSources: VideoHit[][] = [];
          if (result.hits) hitSources.push(result.hits);
          if (result.results) {
            for (const r of result.results) {
              if (r.hits) hitSources.push(r.hits);
            }
          }
          for (const hits of hitSources) {
            for (const hit of hits) {
              if (!hit.bvid) continue;
              map.set(hit.bvid, normalizeVideoHit(hit));
            }
          }
        }
      }
      return map;
    });

    // Tooltip reactive state
    const tooltipVisible = ref(false);
    const tooltipVideoInfo = ref<VideoHit | null>(null);
    const tooltipAnchorRect = ref<DOMRect | null>(null);
    const tooltipContainerRect = ref<DOMRect | null>(null);
    const panelRef = ref<HTMLElement | null>(null);
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const showTooltip = (bvid: string, anchorEl: HTMLElement) => {
      const info = videoMap.value.get(bvid);
      if (!info) return;
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      tooltipVideoInfo.value = info;
      tooltipAnchorRect.value = anchorEl.getBoundingClientRect();
      const container = panelRef.value;
      tooltipContainerRect.value = container
        ? container.getBoundingClientRect()
        : null;
      tooltipVisible.value = true;
    };

    const scheduleHide = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        tooltipVisible.value = false;
        tooltipVideoInfo.value = null;
      }, 120);
    };

    const onTooltipEnter = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };

    const onTooltipLeave = () => {
      scheduleHide();
    };

    const onTooltipWheel = (deltaY: number) => {
      const scrollContainer = panelRef.value?.closest(
        '.chat-results-container'
      ) as HTMLElement | null;
      if (!scrollContainer) return;
      scrollContainer.scrollBy({ top: deltaY });
    };

    // Event delegation for mouseenter/mouseleave on a.bili-video-ref
    const onPanelMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.(
        'a.bili-video-ref'
      ) as HTMLElement | null;
      if (!target) return;
      const bvid = target.dataset.bvid;
      if (bvid) showTooltip(bvid, target);
    };

    const onPanelMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.(
        'a.bili-video-ref'
      ) as HTMLElement | null;
      const related = (e.relatedTarget as HTMLElement)?.closest?.(
        'a.bili-video-ref, .bili-video-tooltip'
      ) as HTMLElement | null;
      if (target && !related) {
        scheduleHide();
      }
    };

    onMounted(() => {
      const el = panelRef.value;
      if (el) {
        el.addEventListener('mouseover', onPanelMouseOver);
        el.addEventListener('mouseout', onPanelMouseOut);
      }
    });

    onBeforeUnmount(() => {
      const el = panelRef.value;
      if (el) {
        el.removeEventListener('mouseover', onPanelMouseOver);
        el.removeEventListener('mouseout', onPanelMouseOut);
      }
      if (hideTimeout) clearTimeout(hideTimeout);
    });

    return {
      thinkingExpanded,
      isLoading,
      hasContent,
      hasThinkingContent,
      isThinkingPhase,
      isDone,
      isAborted,
      hasError,
      perfStats,
      usage,
      toolEvents,
      allToolCalls,
      isThinking,
      errorMessage,
      userQuery,
      historyMessages,
      modeColor,
      loadingText,
      thinkingHeaderLabel,
      renderedContent,
      renderedThinkingContent,
      formattedPerfStats,
      formatToolEvent,
      hasSearchTool,
      renderMd,
      // StreamSegment helpers
      currentStreamSegments,
      renderSegmentThinking,
      isLastThinkingSegment,
      getSegmentToolCalls,
      hasHistoryThinking,
      toggleHistoryThinking,
      isHistoryThinkingExpanded,
      getHistoryToolCalls,
      getHistoryPerfStats,
      handleViewHistoricalResults,
      handleViewCurrentResults,
      // Video tooltip
      panelRef,
      tooltipVisible,
      tooltipVideoInfo,
      tooltipAnchorRect,
      tooltipContainerRect,
      onTooltipEnter,
      onTooltipLeave,
      onTooltipWheel,
    };
  },
});
</script>

<style lang="scss" scoped>
.chat-response-panel {
  position: relative; /* for absolute tooltip positioning */
  max-width: var(--search-input-max-width, 95vw);
  width: var(--search-input-width);
  min-width: 0; /* allow shrinking in flex/grid layouts */
  box-sizing: border-box;

  padding: 16px 14px; /* 两侧内缩 14px，与输入框圆角内边距对齐 */
  font-size: 15px;
  line-height: 1.7;
}

/* 窄屏时减少垂直 padding */
@media (max-width: 768px) {
  .chat-response-panel {
    padding: 12px 0;
  }
}
@media (max-width: 480px) {
  .chat-response-panel {
    padding: 10px 0;
  }
}

/* 用户提问 */
.chat-user-query {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  opacity: 0.8;
  background: rgba(128, 128, 128, 0.06);
}

.user-query-text {
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 历史助手消息 */
.chat-history-assistant {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}

/* 内联工具调用状态 */
.chat-tool-inline {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-inline-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  opacity: 0.45;
}

.tool-inline-icon {
  opacity: 0.6;
}

.tool-inline-text {
  font-style: italic;
}

.tool-inline-link {
  font-size: 11px;
  color: #1976d2;
  cursor: pointer;
  margin-left: 4px;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  &:hover {
    opacity: 1;
    text-decoration: underline;
  }
}

/* 思考/推理内容区域 */
.chat-thinking-section {
  margin-bottom: 14px;
  border-radius: 8px;
  overflow: hidden;
  /* 占满父容器宽度，折叠时保持稳定 */
  width: 100%;
}

/* 思考内容折叠动画容器 */
.chat-thinking-collapse-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-thinking-collapse-wrapper.expanded {
  grid-template-rows: 1fr;
}

.chat-thinking-collapse-inner {
  overflow: hidden;
  min-height: 0;
}

.chat-thinking-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
  border-radius: 8px;
  transition: background 0.15s ease;
  /* 保持稳定高度，避免内容变化时跳动 */
  min-height: 32px;
  background: rgba(128, 128, 128, 0.04);

  &:hover {
    background: rgba(128, 128, 128, 0.08);
  }
}

.thinking-header-text {
  opacity: 0.6;
  font-weight: 500;
}

.thinking-active-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.thinking-dots {
  display: inline-flex;
  align-items: baseline;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  opacity: 0.7;
  margin-left: 1px;

  span {
    animation: thinking-dot-bounce 1.4s ease-in-out infinite;
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes thinking-dot-bounce {
  0%,
  60%,
  100% {
    opacity: 0.2;
  }
  30% {
    opacity: 1;
  }
}

.chat-thinking-content {
  /* 文本与 "思" 字左对齐；border-left 与展开箭头对齐 */
  padding: 8px 14px 8px 13px;
  margin: 0;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  border-left: 2px solid rgba(128, 128, 128, 0.25);
  margin-left: 18px;
  opacity: 0.75;

  /* 去除 Markdown 渲染产生的末尾空行 */
  :deep(> div > :last-child) {
    margin-bottom: 0;
  }

  /* 思考区域内链接样式 */
  :deep(a) {
    color: inherit;
    opacity: 0.85;
    text-decoration: underline;
    text-decoration-color: rgba(128, 128, 128, 0.4);
    text-underline-offset: 2px;
    &:hover {
      opacity: 1;
    }
  }

  :deep(a.bili-video-ref) {
    color: inherit;
    .bili-tv-inline {
      vertical-align: -1.5px;
      margin-right: 2px;
      opacity: 0.5;
    }
  }

  /* 思考区域内标题不放大字体 */
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin-top: 8px;
    margin-bottom: 4px;
    font-weight: 600;
    font-size: 1em;
  }
}

.thinking-expand-icon {
  opacity: 0.45;
  flex-shrink: 0;
}

/* 思考区域内嵌的工具调用（在 streamSegments 时间线中穿插显示） */
.thinking-inline-tools {
  margin-left: 18px;
  margin-top: 4px;
  margin-bottom: 4px;
}

.thinking-cursor {
  opacity: 0.5;
}

/* 加载状态（小巧、左对齐） */
.chat-loading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 0;
}

.chat-loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-loading-text {
  font-size: 13px;
  opacity: 0.6;
}

/* 流式光标 */
.chat-cursor {
  display: inline;
  animation: chat-cursor-blink 0.8s infinite;
  opacity: 0.6;
  font-size: 14px;
}

.tool-after-cursor {
  display: block;
  margin-top: 6px;
}

@keyframes chat-cursor-blink {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0;
  }
}

/* 性能统计 */
.chat-perf-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
  font-size: 12px;
  opacity: 0.45;
}

/* 中止提示 */
.chat-aborted {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(128, 128, 128, 0.1);
  font-size: 12px;
  opacity: 0.5;
  color: inherit;
}

.chat-aborted-text {
  font-size: 12px;
}

/* 错误信息 */
.chat-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 12px;
}

.chat-error-text {
  flex: 1;
  font-size: 14px;
  color: var(--q-negative);
}

/* Markdown 内容样式 */
.chat-content {
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin-top: 12px;
    margin-bottom: 6px;
    font-weight: 600;
    font-size: 1em; /* h2-h6 不额外增大；h1 仅微增 */
  }

  :deep(h1) {
    font-size: calc(1em + 1px);
  }

  :deep(p) {
    margin: 8px 0;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 20px;
    margin: 8px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(a) {
    color: #1976d2;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  :deep(a.bili-video-ref) {
    color: #00a1d6;
    font-weight: 500;
    .bili-tv-inline {
      vertical-align: -2px;
      margin-right: 3px;
      opacity: 0.6;
    }
    &:hover {
      color: #0086b3;
    }
  }

  :deep(code) {
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Fira Code', 'Consolas', monospace;
  }

  :deep(pre) {
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;
    font-size: 0.9em;

    code {
      padding: 0;
      background: none;
    }
  }

  :deep(blockquote) {
    margin: 8px 0;
    padding: 8px 16px;
    border-left: 3px solid;
    border-radius: 0 4px 4px 0;
  }

  :deep(table) {
    border-collapse: collapse;
    margin: 8px 0;
    width: 100%;
  }

  :deep(th),
  :deep(td) {
    padding: 6px 12px;
    text-align: left;
  }

  :deep(hr) {
    margin: 16px 0;
    border: none;
    height: 1px;
  }

  :deep(strong) {
    font-weight: 600;
  }
}

/* Light theme */
body.body--light {
  .chat-response-panel {
    color: #333;
  }

  .chat-user-query {
    background: rgba(0, 0, 0, 0.04);
    color: #555;
  }

  .chat-error {
    background: rgba(244, 67, 54, 0.05);
  }

  .chat-content {
    :deep(code) {
      background: rgba(0, 0, 0, 0.06);
      color: #d63384;
    }

    :deep(pre) {
      background: #f5f5f5;
    }

    :deep(blockquote) {
      background: rgba(0, 0, 0, 0.03);
      border-color: #ddd;
      color: #555;
    }

    :deep(th) {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    :deep(td) {
      border-bottom: 1px solid #eee;
    }

    :deep(hr) {
      background: #e0e0e0;
    }
  }
}

/* Dark theme */
body.body--dark {
  .chat-response-panel {
    color: #ddd;
  }

  .chat-user-query {
    background: rgba(255, 255, 255, 0.06);
    color: #aaa;
  }

  .chat-error {
    background: rgba(244, 67, 54, 0.1);
  }

  .tool-inline-link {
    color: #64b5f6;
  }

  .chat-content {
    :deep(a) {
      color: #64b5f6;
    }

    :deep(a.bili-video-ref) {
      color: #23ade5;
      &:hover {
        color: #4fc3f7;
      }
    }

    :deep(code) {
      background: rgba(255, 255, 255, 0.08);
      color: #e4a0c0;
    }

    :deep(pre) {
      background: #1e1e1e;
    }

    :deep(blockquote) {
      background: rgba(255, 255, 255, 0.04);
      border-color: #444;
      color: #aaa;
    }

    :deep(th) {
      background: #2a2a2a;
      border-bottom: 2px solid #444;
    }

    :deep(td) {
      border-bottom: 1px solid #333;
    }

    :deep(hr) {
      background: #333;
    }
  }
}

/* 思考模式暗色补充 */

body.body--dark {
  .chat-thinking-content {
    border-left-color: rgba(160, 160, 160, 0.25);
  }
}
</style>
