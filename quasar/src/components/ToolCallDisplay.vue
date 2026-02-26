<template>
  <div class="tool-call-container">
    <div
      v-for="(call, idx) in toolCalls"
      :key="`${call.type}-${idx}`"
      class="tool-call-item"
      :class="{
        'tool-call-pending': call.status === 'pending',
        'tool-call-completed': call.status === 'completed',
      }"
    >
      <!-- 工具图标和名称 -->
      <div class="tool-call-header" @click="toggleExpand(idx)">
        <div class="tool-call-left">
          <q-spinner-dots
            v-if="call.status === 'pending'"
            size="14px"
            class="tool-call-spinner"
          />
          <q-icon
            v-else
            :name="getToolIcon(call.type)"
            size="14px"
            class="tool-call-icon"
          />
          <span class="tool-call-name">{{ getToolLabel(call.type) }}</span>
          <span class="tool-call-args">{{ formatToolArgs(call) }}</span>
        </div>
        <div class="tool-call-right">
          <span
            v-if="call.status === 'pending'"
            class="tool-call-status-pending"
          >
            执行中...
          </span>
          <span v-else-if="hasResults(call)" class="tool-call-status-completed">
            {{ getResultCount(call) }}
          </span>
          <q-icon
            v-if="call.status === 'completed' && hasResults(call)"
            :name="expanded[idx] ? 'expand_less' : 'expand_more'"
            size="16px"
            class="tool-call-expand-icon"
          />
        </div>
      </div>

      <!-- 搜索结果预览（可折叠） -->
      <div
        v-if="call.status === 'completed' && hasResults(call) && expanded[idx]"
        class="tool-call-results"
      >
        <div v-if="call.type === 'search_videos'" class="tool-results-grid">
          <div
            v-for="(hit, hidx) in getVideoHits(call).slice(0, maxPreviewItems)"
            :key="hit.bvid || hidx"
            class="tool-result-item"
          >
            <img
              v-if="hit.pic"
              :src="hit.pic"
              class="tool-result-cover"
              loading="lazy"
            />
            <div class="tool-result-info">
              <span class="tool-result-title" :title="hit.title">{{
                hit.title
              }}</span>
              <span class="tool-result-author">{{
                hit.owner?.name || ''
              }}</span>
            </div>
          </div>
          <div
            v-if="getVideoHits(call).length > maxPreviewItems"
            class="tool-result-more"
            @click.stop="$emit('viewAllResults', call)"
          >
            +{{ getVideoHits(call).length - maxPreviewItems }} 更多
          </div>
        </div>
        <div
          v-else-if="call.type === 'check_author'"
          class="tool-result-author-info"
        >
          <div v-if="getAuthorResult(call).found" class="author-found">
            <span class="author-name">{{ getAuthorResult(call).name }}</span>
            <span class="author-mid">mid: {{ getAuthorResult(call).mid }}</span>
          </div>
          <div v-else class="author-not-found">未找到该作者</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue';
import type { ToolCall } from 'src/services/chatService';

/** Video hit from search result */
interface VideoHit {
  bvid?: string;
  pic?: string;
  title?: string;
  owner?: {
    name?: string;
    mid?: number;
  };
}

/** Author result from check_author */
interface AuthorResult {
  found?: boolean;
  name?: string;
  mid?: number;
}

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  check_author: '查询作者',
  read_spec: '阅读文档',
};

/** 工具图标 */
const TOOL_ICONS: Record<string, string> = {
  search_videos: 'search',
  check_author: 'person_search',
  read_spec: 'description',
};

export default defineComponent({
  name: 'ToolCallDisplay',
  props: {
    toolCalls: {
      type: Array as PropType<ToolCall[]>,
      required: true,
    },
    maxPreviewItems: {
      type: Number,
      default: 4,
    },
  },
  emits: ['viewAllResults'],
  setup(props) {
    const expanded = ref<Record<number, boolean>>({});

    const toggleExpand = (idx: number) => {
      const call = props.toolCalls[idx];
      if (call?.status === 'completed' && hasResults(call)) {
        expanded.value[idx] = !expanded.value[idx];
      }
    };

    const getToolLabel = (type: string) => TOOL_LABELS[type] || type;
    const getToolIcon = (type: string) => TOOL_ICONS[type] || 'build';

    const formatToolArgs = (call: ToolCall) => {
      if (call.type === 'search_videos') {
        const queries = call.args?.queries as string[] | undefined;
        if (queries && queries.length > 0) {
          const preview = queries
            .slice(0, 2)
            .map((q) => `"${q}"`)
            .join(', ');
          return queries.length > 2
            ? `${preview} +${queries.length - 2}`
            : preview;
        }
      } else if (call.type === 'check_author') {
        const name = call.args?.name as string | undefined;
        return name ? `"${name}"` : '';
      }
      return '';
    };

    const hasResults = (call: ToolCall) => {
      if (!call.result) return false;
      if (call.type === 'search_videos') {
        const hits = (call.result as Record<string, unknown>)
          ?.hits as unknown[];
        return Array.isArray(hits) && hits.length > 0;
      }
      if (call.type === 'check_author') {
        return true; // Always show author result
      }
      return false;
    };

    const getResultCount = (call: ToolCall) => {
      if (call.type === 'search_videos') {
        const hits = (call.result as Record<string, unknown>)
          ?.hits as unknown[];
        const count = Array.isArray(hits) ? hits.length : 0;
        return `${count} 条结果`;
      }
      if (call.type === 'check_author') {
        const found = (call.result as Record<string, unknown>)?.found;
        return found ? '已找到' : '未找到';
      }
      return '';
    };

    const getVideoHits = (call: ToolCall): VideoHit[] => {
      if (call.type !== 'search_videos') return [];
      const hits = (call.result as Record<string, unknown>)?.hits;
      return Array.isArray(hits) ? (hits as VideoHit[]) : [];
    };

    const getAuthorResult = (call: ToolCall): AuthorResult => {
      if (call.type !== 'check_author') return {};
      return (call.result as AuthorResult) || {};
    };

    return {
      expanded,
      toggleExpand,
      getToolLabel,
      getToolIcon,
      formatToolArgs,
      hasResults,
      getResultCount,
      getVideoHits,
      getAuthorResult,
    };
  },
});
</script>

<style lang="scss" scoped>
.tool-call-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.tool-call-item {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.tool-call-pending {
  background: rgba(128, 128, 128, 0.06);
  border: 1px dashed rgba(128, 128, 128, 0.2);
}

.tool-call-completed {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.12);
}

.tool-call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.06);
  }
}

.tool-call-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.tool-call-spinner {
  color: var(--q-primary);
}

.tool-call-icon {
  opacity: 0.6;
}

.tool-call-name {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.85;
}

.tool-call-args {
  font-size: 12px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.tool-call-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-call-status-pending {
  font-size: 11px;
  color: var(--q-primary);
  opacity: 0.8;
}

.tool-call-status-completed {
  font-size: 11px;
  opacity: 0.5;
}

.tool-call-expand-icon {
  opacity: 0.4;
}

/* 搜索结果预览 */
.tool-call-results {
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.08);
}

.tool-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.tool-result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
  }
}

.tool-result-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 4px;
}

.tool-result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 2px;
}

.tool-result-title {
  font-size: 11px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.85;
}

.tool-result-author {
  font-size: 10px;
  opacity: 0.45;
}

.tool-result-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  font-size: 12px;
  color: var(--q-primary);
  cursor: pointer;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
  }
}

/* 作者查询结果 */
.tool-result-author-info {
  padding: 4px 0;
}

.author-found {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
}

.author-mid {
  font-size: 11px;
  opacity: 0.45;
}

.author-not-found {
  font-size: 12px;
  opacity: 0.5;
  font-style: italic;
}

/* Dark theme */
body.body--dark {
  .tool-call-pending {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .tool-call-completed {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .tool-call-header:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .tool-result-item {
    background: rgba(255, 255, 255, 0.02);
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .tool-result-more {
    background: rgba(255, 255, 255, 0.02);
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
