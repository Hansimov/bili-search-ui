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
    <SearchModeEmptyState
      v-if="showEmptyState"
      :mode="currentMode"
      variant="panel"
      class="chat-empty-state"
    />
    <!-- 多轮对话：历史消息 -->
    <template v-for="(msg, msgIdx) in historyMessages" :key="msg.id">
      <!-- 用户消息 -->
      <component
        :is="getHistoryLinkedAssistant(msgIdx) ? 'button' : 'div'"
        v-if="msg.role === 'user'"
        class="chat-user-query"
        :class="{
          'is-toggle': !!getHistoryLinkedAssistant(msgIdx),
          'is-expanded': isHistoryAnswerExpanded(
            getHistoryLinkedAssistant(msgIdx)?.id || ''
          ),
        }"
        :type="getHistoryLinkedAssistant(msgIdx) ? 'button' : undefined"
        @click="
          getHistoryLinkedAssistant(msgIdx) &&
            toggleHistoryAnswerByIndex(msgIdx)
        "
      >
        <span class="user-query-text">{{ msg.content }}</span>
        <span
          v-if="getHistoryLinkedAssistant(msgIdx)"
          class="chat-round-toggle-bar-state"
        >
          <span>
            {{
              isHistoryAnswerExpanded(
                getHistoryLinkedAssistant(msgIdx)?.id || ''
              )
                ? '收起回复'
                : '展开回复'
            }}
          </span>
          <q-icon
            :name="
              isHistoryAnswerExpanded(
                getHistoryLinkedAssistant(msgIdx)?.id || ''
              )
                ? 'expand_less'
                : 'expand_more'
            "
            size="16px"
          />
        </span>
      </component>
      <!-- 助手消息（历史） -->
      <div v-else-if="msg.role === 'assistant'" class="chat-history-assistant">
        <div
          class="chat-answer-collapse-wrapper"
          :class="{ expanded: isHistoryAnswerExpanded(msg.id) }"
        >
          <div class="chat-answer-collapse-inner">
            <!-- 历史思考过程+工具调用（按时间线交替渲染） -->
            <div v-if="hasHistoryThinking(msg)" class="chat-thinking-section">
              <div
                class="chat-thinking-header"
                @click="toggleHistoryThinking(msg.id)"
              >
                <div class="chat-thinking-header-main">
                  <span class="thinking-header-text">思考过程</span>
                </div>
                <q-icon
                  :name="
                    isHistoryThinkingExpanded(msg.id)
                      ? 'expand_less'
                      : 'expand_more'
                  "
                  size="18px"
                  class="thinking-expand-icon"
                />
              </div>
              <div
                class="chat-thinking-collapse-wrapper"
                :class="{ expanded: isHistoryThinkingExpanded(msg.id) }"
              >
                <div class="chat-thinking-collapse-inner">
                  <template
                    v-if="msg.streamSegments && msg.streamSegments.length > 0"
                  >
                    <template
                      v-for="(seg, sIdx) in msg.streamSegments"
                      :key="sIdx"
                    >
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
                          seg.type === 'tool' &&
                          getSegmentToolCalls(seg).length > 0
                        "
                        :toolCalls="getSegmentToolCalls(seg)"
                        isHistorical
                        @viewAllResults="handleViewHistoricalResults"
                        class="thinking-inline-tools"
                      />
                    </template>
                  </template>
                  <template v-else>
                    <div
                      v-if="msg.thinkingContent"
                      class="chat-thinking-content"
                    >
                      <div
                        v-html="
                          renderMd(msg.thinkingContent.replace(/\\n+$/, ''))
                        "
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
              v-if="hasRenderableBvLinks(msg.content)"
              class="chat-content-toolbar"
            >
              <div class="chat-content-view-switch" @click.stop>
                <button
                  v-for="option in videoViewOptions"
                  :key="option.value"
                  type="button"
                  class="chat-content-view-option"
                  :class="{ active: videoLinkView === option.value }"
                  @click="setVideoLinkView(option.value)"
                >
                  <q-icon :name="option.icon" size="14px" />
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </div>
            <div
              class="chat-content markdown-body"
              v-html="renderAnswerMd(msg.content)"
            ></div>

            <!-- 历史消息的性能统计 -->
            <div v-if="getHistoryPerfStats(msg)" class="chat-perf-stats">
              <span class="perf-text">{{ getHistoryPerfStats(msg) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 当前回合：用户提问 -->
    <component
      :is="shouldShowCurrentAnswerToggle ? 'button' : 'div'"
      v-if="userQuery"
      class="chat-user-query"
      :class="{
        'is-toggle': shouldShowCurrentAnswerToggle,
        'is-expanded': currentAnswerExpanded,
      }"
      :type="shouldShowCurrentAnswerToggle ? 'button' : undefined"
      @click="
        shouldShowCurrentAnswerToggle &&
          (currentAnswerExpanded = !currentAnswerExpanded)
      "
    >
      <span class="user-query-text">{{ userQuery }}</span>
      <span
        v-if="shouldShowCurrentAnswerToggle"
        class="chat-round-toggle-bar-state"
      >
        <span>{{ currentAnswerExpanded ? '收起回复' : '展开回复' }}</span>
        <q-icon
          :name="currentAnswerExpanded ? 'expand_less' : 'expand_more'"
          size="16px"
        />
      </span>
    </component>

    <div
      class="chat-answer-collapse-wrapper"
      :class="{ expanded: currentAnswerExpanded }"
    >
      <div class="chat-answer-collapse-inner">
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
            <q-spinner-dots size="16px" color="grey-6" />
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
            <div class="chat-thinking-header-main">
              <span v-if="thinkingHeaderLabel" class="thinking-header-text">{{
                thinkingHeaderLabel
              }}</span>
              <span v-if="isThinkingPhase" class="thinking-active-indicator">
                <span class="thinking-header-text">思考中</span>
                <span class="thinking-dots"
                  ><span>.</span><span>.</span><span>.</span></span
                >
              </span>
            </div>
            <q-icon
              :name="thinkingExpanded ? 'expand_less' : 'expand_more'"
              size="18px"
              class="thinking-expand-icon"
            />
          </div>
          <!-- 可折叠内容：按时间线渲染 thinking 文本 + tool calls -->
          <div
            class="chat-thinking-collapse-wrapper"
            :class="{ expanded: thinkingExpanded }"
          >
            <div class="chat-thinking-collapse-inner">
              <template
                v-for="(seg, sIdx) in currentStreamSegments"
                :key="sIdx"
              >
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
                  v-if="
                    seg.type === 'tool' && getSegmentToolCalls(seg).length > 0
                  "
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
          v-if="hasContent && hasCurrentBvLinks"
          class="chat-content-toolbar"
        >
          <div class="chat-content-view-switch" @click.stop>
            <button
              v-for="option in videoViewOptions"
              :key="option.value"
              type="button"
              class="chat-content-view-option"
              :class="{ active: videoLinkView === option.value }"
              @click="setVideoLinkView(option.value)"
            >
              <q-icon :name="option.icon" size="14px" />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>
        <div
          v-if="hasContent"
          class="chat-content markdown-body"
          v-html="renderedContent"
        ></div>

        <!-- 流式光标（正在生成回答内容时显示） -->
        <span
          v-if="isLoading && hasContent && !isThinkingPhase"
          class="chat-cursor"
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
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import {
  useChatStore,
  type ConversationMessage,
  type StreamSegment,
} from 'src/stores/chatStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import type {
  ToolEvent,
  ToolCall,
  PerfStats,
  Usage,
} from 'src/services/chatService';
import { renderMarkdown } from 'src/utils/markdown';
import { humanReadableNumber, secondsToDuration } from 'src/utils/convert';
import { normalizeVideoHit, normalizeVideoPicUrl } from 'src/utils/videoHit';
import ToolCallDisplay from './ToolCallDisplay.vue';
import BiliVideoTooltip from './BiliVideoTooltip.vue';
import SearchModeEmptyState from './SearchModeEmptyState.vue';

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  check_author: '查询作者',
  read_spec: '阅读文档',
};

const RENDERED_BV_LINK_RE =
  /<a\s+href="https:\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)"[^>]*class="bili-video-ref"[^>]*>(.*?)<\/a>/g;
const RENDERED_BV_LINK_DETECT_RE =
  /<a\s+href="https:\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)"[^>]*class="bili-video-ref"[^>]*>/;
const VIDEO_LINK_VIEW_STORAGE_KEY = 'chat-response-video-link-view';
const VIDEO_LINK_VIEW_SESSION_KEY_PREFIX = 'chat-response-video-link-view:';

type VideoLinkViewMode = 'text' | 'card' | 'compact';

const VIDEO_VIEW_OPTIONS: Array<{
  value: VideoLinkViewMode;
  label: string;
  icon: string;
}> = [
  { value: 'text', label: '文本', icon: 'article' },
  { value: 'card', label: '卡片', icon: 'view_agenda' },
  { value: 'compact', label: '紧凑', icon: 'grid_view' },
];

export default defineComponent({
  name: 'ChatResponsePanel',
  components: {
    ToolCallDisplay,
    BiliVideoTooltip,
    SearchModeEmptyState,
  },
  emits: ['retry', 'showResults'],
  setup(_props, { emit }) {
    const chatStore = useChatStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();
    const searchModeStore = useSearchModeStore();

    const readPersistedVideoLinkView = (
      sessionId?: string | null
    ): VideoLinkViewMode => {
      if (typeof window === 'undefined') return 'text';

      if (sessionId) {
        const storedForSession = window.localStorage.getItem(
          `${VIDEO_LINK_VIEW_SESSION_KEY_PREFIX}${sessionId}`
        );
        if (
          storedForSession === 'text' ||
          storedForSession === 'card' ||
          storedForSession === 'compact'
        ) {
          return storedForSession;
        }
      }

      const stored = window.localStorage.getItem(VIDEO_LINK_VIEW_STORAGE_KEY);
      if (stored === 'text' || stored === 'card' || stored === 'compact') {
        return stored;
      }
      return 'text';
    };

    const persistVideoLinkView = (
      mode: VideoLinkViewMode,
      sessionId?: string | null
    ) => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(VIDEO_LINK_VIEW_STORAGE_KEY, mode);
      if (sessionId) {
        window.localStorage.setItem(
          `${VIDEO_LINK_VIEW_SESSION_KEY_PREFIX}${sessionId}`,
          mode
        );
      }
    };

    const thinkingExpanded = ref(false);
    const currentAnswerExpanded = ref(true);
    const videoLinkView = ref<VideoLinkViewMode>('text');

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
    const currentMode = computed(() => searchModeStore.currentMode);
    const showEmptyState = computed(() => {
      return (
        currentMode.value !== 'direct' &&
        historyMessages.value.length === 0 &&
        !userQuery.value &&
        !isLoading.value &&
        !hasContent.value &&
        !hasThinkingContent.value &&
        !hasError.value &&
        !isAborted.value &&
        allToolCalls.value.length === 0
      );
    });

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

    const loadingText = computed(() => {
      return '思考中';
    });

    /** 思考标题：思考中时不显示 "思考过程"，完成后才显示 */
    const thinkingHeaderLabel = computed(() => {
      if (isThinkingPhase.value) return '';
      return '思考过程';
    });

    const stripHtml = (value: string): string => {
      return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const escapeHtml = (value: string): string => {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const formatVideoViews = (views?: number): string => {
      if (views == null) return '';
      return `${humanReadableNumber(views)} 播放`;
    };

    const formatVideoDuration = (duration?: number): string => {
      if (!duration) return '';
      return secondsToDuration(duration);
    };

    const formatVideoCompactStats = (video: VideoHit): string => {
      const author = escapeHtml(video.owner?.name || '');
      const views = escapeHtml(formatVideoViews(video.stat?.view));

      if (!author && !views) {
        return '';
      }

      if (!author) {
        return `<span class="bili-video-compact-views">${views}</span>`;
      }

      if (!views) {
        return `<span class="bili-video-compact-author">${author}</span>`;
      }

      return `<span class="bili-video-compact-author">${author}</span><span class="bili-video-compact-stat-separator">·</span><span class="bili-video-compact-views">${views}</span>`;
    };

    const renderAnswerMd = (text: string): string => {
      const html = renderMarkdown(text);
      if (!html || videoLinkView.value === 'text') {
        return html;
      }

      return html.replace(RENDERED_BV_LINK_RE, (match, bvid, innerHtml) => {
        const video = videoMap.value.get(bvid);
        if (!video) {
          return match;
        }

        const coverUrl = normalizeVideoPicUrl(video.pic);
        const title = escapeHtml(video.title || stripHtml(innerHtml) || bvid);
        const author = escapeHtml(video.owner?.name || '');
        const viewText = escapeHtml(formatVideoViews(video.stat?.view));
        const duration = escapeHtml(formatVideoDuration(video.duration));
        const compactStats = formatVideoCompactStats(video);

        if (videoLinkView.value === 'compact') {
          return `<a href="https://www.bilibili.com/video/${bvid}" class="bili-video-compact-ref" data-bvid="${bvid}" target="_blank" rel="noopener"><span class="bili-video-compact-cover-wrap">${
            coverUrl
              ? `<img src="${escapeHtml(
                  coverUrl
                )}" class="bili-video-compact-cover" loading="lazy" referrerpolicy="no-referrer" />`
              : '<span class="bili-video-compact-cover bili-video-compact-cover-placeholder"></span>'
          }${
            duration
              ? `<span class="bili-video-compact-duration">${duration}</span>`
              : ''
          }</span><span class="bili-video-compact-meta"><span class="bili-video-compact-title">${title}</span>${
            compactStats
              ? `<span class="bili-video-compact-stats">${compactStats}</span>`
              : ''
          }</span></a>`;
        }

        return `<a href="https://www.bilibili.com/video/${bvid}" class="bili-video-card-ref" data-bvid="${bvid}" target="_blank" rel="noopener"><span class="bili-video-card-cover-wrap">${
          coverUrl
            ? `<img src="${escapeHtml(
                coverUrl
              )}" class="bili-video-card-cover" loading="lazy" referrerpolicy="no-referrer" />`
            : '<span class="bili-video-card-cover bili-video-card-cover-placeholder"></span>'
        }${
          duration
            ? `<span class="bili-video-card-duration">${duration}</span>`
            : ''
        }</span><span class="bili-video-card-meta"><span class="bili-video-card-title">${title}</span><span class="bili-video-card-subline">${
          author ? `<span class="bili-video-card-author">${author}</span>` : ''
        }${
          viewText
            ? `<span class="bili-video-card-views">${viewText}</span>`
            : ''
        }</span></span></a>`;
      });
    };

    const hasRenderableBvLinks = (text: string): boolean => {
      if (!text) return false;
      return RENDERED_BV_LINK_DETECT_RE.test(renderMarkdown(text));
    };

    /** 渲染 Markdown 内容为 HTML */
    const renderedContent = computed(() => {
      const raw = chatStore.content;
      if (!raw) return '';
      return renderAnswerMd(raw);
    });

    const hasCurrentBvLinks = computed(() => {
      return hasRenderableBvLinks(chatStore.content || '');
    });

    const videoViewOptions = VIDEO_VIEW_OPTIONS;

    const setVideoLinkView = (mode: VideoLinkViewMode) => {
      videoLinkView.value = mode;
      persistVideoLinkView(mode, chatStore.currentSessionId);
    };

    watch(
      () => chatStore.currentSessionId,
      (sessionId) => {
        videoLinkView.value = readPersistedVideoLinkView(sessionId);
      },
      { immediate: true }
    );

    /** 渲染思考内容为 HTML（去除末尾空行） */
    const renderedThinkingContent = computed(() => {
      let raw = chatStore.thinkingContent;
      if (!raw) return '';
      // 去除末尾空行
      raw = raw.replace(/\n+$/, '');
      return renderMarkdown(raw);
    });

    const shouldShowCurrentAnswerToggle = computed(() => {
      return (
        !!userQuery.value &&
        (isLoading.value ||
          hasThinkingContent.value ||
          hasContent.value ||
          allToolCalls.value.length > 0 ||
          isAborted.value ||
          hasError.value ||
          !!perfStats.value)
      );
    });

    watch(
      isThinkingPhase,
      (thinking) => {
        if (thinking) {
          thinkingExpanded.value = true;
        }
      },
      { immediate: true }
    );

    watch(
      () => chatStore.currentSession.query,
      (query, previousQuery) => {
        if (query && query !== previousQuery) {
          currentAnswerExpanded.value = true;
          thinkingExpanded.value = false;
        }
      }
    );

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
    const historyAnswerExpandedMap = reactive<Record<string, boolean>>({});

    const getHistoryLinkedAssistant = (
      msgIdx: number
    ): ConversationMessage | null => {
      const nextMsg = historyMessages.value[msgIdx + 1];
      if (!nextMsg || nextMsg.role !== 'assistant') {
        return null;
      }
      return nextMsg;
    };

    const toggleHistoryAnswer = (msgId: string) => {
      historyAnswerExpandedMap[msgId] = !isHistoryAnswerExpanded(msgId);
    };

    const toggleHistoryAnswerByIndex = (msgIdx: number) => {
      const assistantMsg = getHistoryLinkedAssistant(msgIdx);
      if (!assistantMsg) return;
      toggleHistoryAnswer(assistantMsg.id);
    };

    const isHistoryAnswerExpanded = (msgId: string): boolean => {
      return historyAnswerExpandedMap[msgId] !== false;
    };

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
        'a.bili-video-ref, a.bili-video-card-ref, a.bili-video-compact-ref'
      ) as HTMLElement | null;
      if (!target) return;
      const bvid = target.dataset.bvid;
      if (bvid) showTooltip(bvid, target);
    };

    const onPanelMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.(
        'a.bili-video-ref, a.bili-video-card-ref, a.bili-video-compact-ref'
      ) as HTMLElement | null;
      const related = (e.relatedTarget as HTMLElement)?.closest?.(
        'a.bili-video-ref, a.bili-video-card-ref, a.bili-video-compact-ref, .bili-video-tooltip'
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
      currentAnswerExpanded,
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
      showEmptyState,
      currentMode,
      userQuery,
      historyMessages,
      loadingText,
      thinkingHeaderLabel,
      renderedContent,
      hasCurrentBvLinks,
      videoLinkView,
      videoViewOptions,
      setVideoLinkView,
      hasRenderableBvLinks,
      renderAnswerMd,
      renderedThinkingContent,
      shouldShowCurrentAnswerToggle,
      formattedPerfStats,
      formatToolEvent,
      hasSearchTool,
      renderMd,
      // StreamSegment helpers
      currentStreamSegments,
      renderSegmentThinking,
      isLastThinkingSegment,
      getSegmentToolCalls,
      getHistoryLinkedAssistant,
      toggleHistoryAnswerByIndex,
      isHistoryAnswerExpanded,
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

.chat-empty-state {
  width: 100%;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin-bottom: 12px;
  padding: 9px 13px;
  border: 1px solid rgba(128, 128, 128, 0.1);
  border-radius: 10px;
  font-size: 14px;
  opacity: 0.84;
  background: rgba(128, 128, 128, 0.042);
  transition: background 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease, opacity 0.18s ease;
}

.chat-user-query.is-toggle {
  appearance: none;
  text-align: left;
  cursor: pointer;
}

.chat-user-query.is-toggle:hover {
  opacity: 0.94;
  background: rgba(128, 128, 128, 0.06);
  border-color: rgba(128, 128, 128, 0.14);
  box-shadow: none;
}

.chat-user-query.is-toggle:focus-visible {
  outline: none;
  border-color: rgba(24, 144, 255, 0.38);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.12);
}

.chat-user-query.is-expanded {
  opacity: 0.92;
  background: rgba(128, 128, 128, 0.058);
}

.user-query-text {
  flex: 1;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  min-width: 0;
  font-weight: 520;
}

.chat-round-toggle-bar-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.58;
  white-space: nowrap;
}

/* 历史助手消息 */
.chat-history-assistant {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}

.chat-answer-collapse-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-answer-collapse-wrapper.expanded {
  grid-template-rows: 1fr;
}

.chat-answer-collapse-inner {
  overflow: hidden;
  min-height: 0;
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
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
  user-select: none;
  border: 1px solid rgba(128, 128, 128, 0.06);
  border-radius: 8px;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  /* 保持稳定高度，避免内容变化时跳动 */
  min-height: 28px;
  background: rgba(128, 128, 128, 0.024);
  opacity: 0.72;

  &:hover {
    background: rgba(128, 128, 128, 0.04);
    border-color: rgba(128, 128, 128, 0.08);
    opacity: 0.82;
  }
}

.chat-thinking-header-main {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.thinking-header-text {
  opacity: 0.62;
  font-weight: 500;
}

.thinking-active-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  min-width: 0;
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
  opacity: 0.44;
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

.chat-content-toolbar {
  display: flex;
  justify-content: flex-start;
  margin: 4px 0 8px;
}

.chat-content-view-switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.chat-content-view-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid rgba(128, 128, 128, 0.08);
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.03);
  color: inherit;
  font-size: 11px;
  line-height: 1.2;
  opacity: 0.6;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

  &:hover {
    opacity: 0.78;
    background: rgba(128, 128, 128, 0.05);
    border-color: rgba(128, 128, 128, 0.12);
  }
}

.chat-content-view-option.active {
  opacity: 0.9;
  background: rgba(128, 128, 128, 0.07);
  border-color: rgba(128, 128, 128, 0.14);
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

  :deep(a.bili-video-card-ref) {
    display: flex;
    align-items: stretch;
    gap: 10px;
    margin: 10px 0;
    padding: 8px;
    border: 1px solid rgba(128, 128, 128, 0.08);
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.025);
    color: inherit;
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: rgba(128, 128, 128, 0.05);
      border-color: rgba(128, 128, 128, 0.12);
      text-decoration: none;
    }
  }

  :deep(.bili-video-card-cover-wrap) {
    position: relative;
    width: 112px;
    min-width: 112px;
    aspect-ratio: 16 / 10;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.08);
  }

  :deep(.bili-video-card-cover) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  :deep(.bili-video-card-cover-placeholder) {
    display: block;
    width: 100%;
    height: 100%;
    background: rgba(128, 128, 128, 0.08);
  }

  :deep(.bili-video-card-duration) {
    position: absolute;
    right: 6px;
    bottom: 6px;
    padding: 1px 5px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.58);
    color: #fff;
    font-size: 10px;
    line-height: 1.4;
  }

  :deep(.bili-video-card-meta) {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  :deep(.bili-video-card-title) {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 500;
    color: inherit;
  }

  :deep(.bili-video-card-subline) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    line-height: 1.4;
    opacity: 0.56;
  }

  :deep(a.bili-video-compact-ref) {
    display: inline-flex;
    width: calc((100% - 24px) / 3);
    min-width: 156px;
    max-width: 188px;
    margin: 8px 10px 8px 0;
    flex-direction: column;
    vertical-align: top;
    border: 1px solid rgba(128, 128, 128, 0.08);
    border-radius: 10px;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.025);
    color: inherit;
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: rgba(128, 128, 128, 0.05);
      border-color: rgba(128, 128, 128, 0.12);
      text-decoration: none;
    }
  }

  :deep(.bili-video-compact-cover-wrap) {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.08);
  }

  :deep(.bili-video-compact-cover) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :deep(.bili-video-compact-cover-placeholder) {
    display: block;
    width: 100%;
    height: 100%;
    background: rgba(128, 128, 128, 0.08);
  }

  :deep(.bili-video-compact-duration) {
    position: absolute;
    right: 6px;
    bottom: 6px;
    padding: 1px 5px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.58);
    color: #fff;
    font-size: 10px;
    line-height: 1.4;
  }

  :deep(.bili-video-compact-meta) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 9px 9px;
    min-width: 0;
  }

  :deep(.bili-video-compact-title) {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 500;
    color: inherit;
  }

  :deep(.bili-video-compact-stats) {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0 6px;
    font-size: 10px;
    line-height: 1.35;
    opacity: 0.54;
  }

  :deep(.bili-video-compact-author),
  :deep(.bili-video-compact-views) {
    display: inline-flex;
    align-items: center;
  }

  :deep(.bili-video-compact-views) {
    letter-spacing: 0.01em;
  }

  :deep(.bili-video-compact-stat-separator) {
    opacity: 0.45;
    transform: translateY(-0.5px);
  }

  @media (max-width: 900px) {
    :deep(a.bili-video-compact-ref) {
      width: calc((100% - 12px) / 2);
      min-width: 0;
      max-width: none;
      margin-right: 8px;
    }
  }

  @media (max-width: 560px) {
    :deep(a.bili-video-compact-ref) {
      display: flex;
      width: 100%;
      margin-right: 0;
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
    background: rgba(0, 0, 0, 0.036);
    border-color: rgba(0, 0, 0, 0.08);
    color: #555;
  }

  .chat-user-query.is-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.12);
  }

  .chat-user-query.is-expanded {
    background: rgba(0, 0, 0, 0.046);
  }

  .chat-thinking-header {
    background: rgba(0, 0, 0, 0.018);
    border-color: rgba(0, 0, 0, 0.045);
  }

  .chat-thinking-header:hover {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.07);
  }

  .chat-error {
    background: rgba(244, 67, 54, 0.05);
  }

  .chat-content-view-option {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.07);
  }

  .chat-content-view-option:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .chat-content-view-option.active {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }

  .chat-content {
    :deep(code) {
      background: rgba(0, 0, 0, 0.06);
      color: #0f6f82;
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
    background: rgba(255, 255, 255, 0.045);
    border-color: rgba(255, 255, 255, 0.1);
    color: #aaa;
  }

  .chat-user-query.is-toggle:hover {
    background: rgba(255, 255, 255, 0.062);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .chat-user-query.is-expanded {
    background: rgba(255, 255, 255, 0.058);
  }

  .chat-thinking-header {
    background: rgba(255, 255, 255, 0.024);
    border-color: rgba(255, 255, 255, 0.06);
  }

  .chat-thinking-header:hover {
    background: rgba(255, 255, 255, 0.038);
    border-color: rgba(255, 255, 255, 0.09);
  }

  .chat-error {
    background: rgba(244, 67, 54, 0.1);
  }

  .chat-content-view-option {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.07);
  }

  .chat-content-view-option:hover {
    background: rgba(255, 255, 255, 0.035);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .chat-content-view-option.active {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
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

    :deep(a.bili-video-card-ref) {
      background: rgba(255, 255, 255, 0.022);
      border-color: rgba(255, 255, 255, 0.08);

      &:hover {
        background: rgba(255, 255, 255, 0.038);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }

    :deep(a.bili-video-compact-ref) {
      background: rgba(255, 255, 255, 0.022);
      border-color: rgba(255, 255, 255, 0.08);

      &:hover {
        background: rgba(255, 255, 255, 0.038);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }

    :deep(code) {
      background: rgba(255, 255, 255, 0.08);
      color: #82d7e6;
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
