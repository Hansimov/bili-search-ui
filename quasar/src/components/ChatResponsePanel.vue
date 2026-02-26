<template>
  <div class="chat-response-panel" :class="{ 'chat-thinking': isThinking }">
    <!-- 工具调用状态指示（实时流式更新） -->
    <div v-if="toolEvents.length > 0" class="chat-tool-events">
      <div
        v-for="(event, idx) in toolEvents"
        :key="idx"
        class="tool-event-item"
      >
        <q-icon name="build" size="14px" class="tool-event-icon" />
        <span class="tool-event-text">
          {{ formatToolEvent(event) }}
        </span>
      </div>
    </div>

    <!-- 加载状态：等待 LLM 响应（无思考内容、无回答内容时显示） -->
    <div
      v-if="isLoading && !hasContent && !hasThinkingContent"
      class="chat-loading"
    >
      <div class="chat-loading-indicator">
        <q-spinner-dots size="24px" :color="modeColor" />
        <span class="chat-loading-text">{{ loadingText }}</span>
      </div>
    </div>

    <!-- 思考/推理内容区域（可折叠） -->
    <div v-if="hasThinkingContent" class="chat-thinking-section">
      <div
        class="chat-thinking-header"
        @click="thinkingExpanded = !thinkingExpanded"
      >
        <q-icon
          :name="thinkingExpanded ? 'expand_less' : 'expand_more'"
          size="18px"
        />
        <q-icon name="psychology" size="16px" class="thinking-icon" />
        <span class="thinking-header-text">思考过程</span>
        <span v-if="isThinkingPhase" class="thinking-active-badge"
          >思考中…</span
        >
      </div>
      <div v-show="thinkingExpanded" class="chat-thinking-content">
        <div v-html="renderedThinkingContent"></div>
        <span v-if="isThinkingPhase" class="chat-cursor thinking-cursor"
          >▊</span
        >
      </div>
    </div>

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

    <!-- 性能统计 -->
    <div v-if="isDone && perfStats" class="chat-perf-stats">
      <q-icon name="speed" size="14px" class="perf-icon" />
      <span class="perf-text">
        {{ perfStats.total_elapsed }}
        · {{ perfStats.tokens_per_second }} tokens/s
        <template v-if="usage">
          · {{ usage.completion_tokens ?? 0 }} tokens
        </template>
      </span>
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
import { computed, defineComponent, ref } from 'vue';
import { useChatStore } from 'src/stores/chatStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import type { ToolEvent } from 'src/services/chatService';
import { renderMarkdown } from 'src/utils/markdown';

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  check_author: '查询作者',
  read_spec: '阅读文档',
};

export default defineComponent({
  name: 'ChatResponsePanel',
  emits: ['retry'],
  setup() {
    const chatStore = useChatStore();
    const searchModeStore = useSearchModeStore();

    const thinkingExpanded = ref(true);

    const isLoading = computed(() => chatStore.isLoading);
    const hasContent = computed(() => chatStore.hasContent);
    const hasThinkingContent = computed(() => chatStore.hasThinkingContent);
    const isThinkingPhase = computed(() => chatStore.isThinkingPhase);
    const isDone = computed(() => chatStore.isDone);
    const hasError = computed(() => chatStore.hasError);
    const perfStats = computed(() => chatStore.perfStats);
    const usage = computed(() => chatStore.usage);
    const toolEvents = computed(() => chatStore.toolEvents);
    const isThinking = computed(() => chatStore.currentSession.thinking);
    const errorMessage = computed(
      () => chatStore.currentSession.error || '请求失败'
    );

    const modeColor = computed(() => {
      const mode = searchModeStore.currentMode;
      if (mode === 'think') return 'purple-5';
      return 'teal-5';
    });

    const loadingText = computed(() => {
      if (isThinking.value) return 'AI 正在深度思考...';
      return 'AI 正在回答...';
    });

    /** 渲染 Markdown 内容为 HTML */
    const renderedContent = computed(() => {
      const raw = chatStore.content;
      if (!raw) return '';
      return renderMarkdown(raw);
    });

    /** 渲染思考内容为 HTML */
    const renderedThinkingContent = computed(() => {
      const raw = chatStore.thinkingContent;
      if (!raw) return '';
      return renderMarkdown(raw);
    });

    /** 格式化工具事件显示 */
    const formatToolEvent = (event: ToolEvent): string => {
      const toolNames = event.tools.map((t) => TOOL_LABELS[t] || t).join('、');
      return `第 ${event.iteration} 轮：${toolNames}`;
    };

    return {
      thinkingExpanded,
      isLoading,
      hasContent,
      hasThinkingContent,
      isThinkingPhase,
      isDone,
      hasError,
      perfStats,
      usage,
      toolEvents,
      isThinking,
      errorMessage,
      modeColor,
      loadingText,
      renderedContent,
      renderedThinkingContent,
      formatToolEvent,
    };
  },
});
</script>

<style lang="scss" scoped>
.chat-response-panel {
  max-width: min(800px, 90vw);
  margin: 0 auto;
  padding: 16px 20px;
  font-size: 15px;
  line-height: 1.7;
}

/* 工具调用事件 */
.chat-tool-events {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-event-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.tool-event-icon {
  opacity: 0.6;
}

.tool-event-text {
  opacity: 0.7;
}

/* 思考/推理内容区域 */
.chat-thinking-section {
  margin-bottom: 14px;
  border-radius: 8px;
  overflow: hidden;
}

.chat-thinking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
  border-radius: 8px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
  }
}

.thinking-icon {
  opacity: 0.6;
}

.thinking-header-text {
  opacity: 0.6;
  font-weight: 500;
}

.thinking-active-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(142, 36, 170, 0.12);
  color: #8e24aa;
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.chat-thinking-content {
  padding: 8px 14px;
  margin: 0 4px;
  font-size: 13px;
  line-height: 1.65;
  border-left: 3px solid rgba(142, 36, 170, 0.3);
  opacity: 0.75;
  font-style: italic;
}

.thinking-cursor {
  color: #8e24aa;
}

/* 加载状态 */
.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
}

.chat-loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-loading-text {
  font-size: 14px;
  opacity: 0.7;
}

/* 流式光标 */
.chat-cursor {
  display: inline;
  animation: chat-cursor-blink 0.8s infinite;
  opacity: 0.6;
  font-size: 14px;
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
  opacity: 0.5;
}

.perf-icon {
  opacity: 0.7;
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
  :deep(h4) {
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  :deep(h1) {
    font-size: 1.4em;
  }
  :deep(h2) {
    font-size: 1.2em;
  }
  :deep(h3) {
    font-size: 1.1em;
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

  .tool-event-item {
    background: rgba(0, 0, 0, 0.05);
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

  .tool-event-item {
    background: rgba(255, 255, 255, 0.07);
    color: #aaa;
  }

  .chat-error {
    background: rgba(244, 67, 54, 0.1);
  }

  .chat-content {
    :deep(a) {
      color: #64b5f6;
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

/* 思考模式额外样式 */
.chat-thinking {
  .chat-loading-text {
    color: #8e24aa;
  }
}

body.body--dark .chat-thinking {
  .chat-loading-text {
    color: #ce93d8;
  }
}

body.body--dark {
  .thinking-active-badge {
    background: rgba(206, 147, 216, 0.15);
    color: #ce93d8;
  }

  .chat-thinking-content {
    border-left-color: rgba(206, 147, 216, 0.3);
  }

  .thinking-cursor {
    color: #ce93d8;
  }
}
</style>
