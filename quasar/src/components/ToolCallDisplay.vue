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
          <span v-if="call.type !== 'search_videos'" class="tool-call-args">{{
            formatToolArgs(call)
          }}</span>
          <span
            v-else-if="getQueryList(call).length <= 1"
            class="tool-call-args-full"
            >{{ getQueryList(call)[0] || '' }}</span
          >
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
      <!-- 多 query 子列表（search_videos 有 2+ queries 时显示） -->
      <div
        v-if="call.type === 'search_videos' && getQueryList(call).length > 1"
        class="tool-query-list"
      >
        <div
          v-for="(query, qidx) in getQueryList(call)"
          :key="qidx"
          class="tool-query-item"
        >
          <q-icon name="search" size="12px" class="tool-query-icon" />
          <span class="tool-query-text">{{ query }}</span>
        </div>
      </div>

      <!-- 搜索结果预览（可折叠，带动画） -->
      <div
        v-if="call.status === 'completed' && hasResults(call)"
        class="tool-call-results-wrapper"
        :class="{ expanded: expanded[idx] }"
      >
        <div class="tool-call-results-inner">
          <div class="tool-call-results">
            <div v-if="call.type === 'search_videos'">
              <!-- 多 query 分组显示 -->
              <template v-if="getPerQueryResults(call).length > 1">
                <div
                  v-for="(qr, qridx) in getPerQueryResults(call)"
                  :key="qridx"
                  class="per-query-section"
                >
                  <div class="per-query-header">
                    <q-icon name="search" size="12px" class="per-query-icon" />
                    <span class="per-query-text">{{ qr.query }}</span>
                    <span class="per-query-count">{{ qr.hits.length }} 条</span>
                  </div>
                  <div class="tool-results-grid">
                    <div
                      v-for="(hit, hidx) in qr.hits"
                      :key="hit.bvid || hidx"
                      class="tool-result-item"
                      @click="openVideoPage(hit)"
                    >
                      <img
                        v-if="hit.pic"
                        :src="normalizePicUrl(hit.pic)"
                        class="tool-result-cover"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />
                      <div v-else class="tool-result-cover-placeholder">
                        <q-icon name="smart_display" size="20px" />
                      </div>
                      <div class="tool-result-info">
                        <span class="tool-result-title" :title="hit.title">{{
                          hit.title
                        }}</span>
                        <span class="tool-result-author">{{
                          hit.owner?.name || ''
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <!-- 单 query 扁平显示 -->
              <div v-else class="tool-results-grid">
                <div
                  v-for="(hit, hidx) in getAllVideoHits(call)"
                  :key="hit.bvid || hidx"
                  class="tool-result-item"
                  @click="openVideoPage(hit)"
                >
                  <img
                    v-if="hit.pic"
                    :src="normalizePicUrl(hit.pic)"
                    class="tool-result-cover"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <div v-else class="tool-result-cover-placeholder">
                    <q-icon name="smart_display" size="20px" />
                  </div>
                  <div class="tool-result-info">
                    <span class="tool-result-title" :title="hit.title">{{
                      hit.title
                    }}</span>
                    <span class="tool-result-author">{{
                      hit.owner?.name || ''
                    }}</span>
                  </div>
                </div>
              </div>
              <!-- 操作按钮：查看全部 -->
              <div
                v-if="getAllVideoHits(call).length > 0"
                class="tool-result-actions"
              >
                <q-btn
                  flat
                  dense
                  no-caps
                  size="sm"
                  icon="open_in_new"
                  :label="`查看全部 ${getAllVideoHits(call).length} 条`"
                  class="tool-view-all-btn"
                  @click.stop="$emit('viewAllResults', call)"
                />
              </div>
            </div>
            <div
              v-else-if="call.type === 'check_author'"
              class="tool-result-author-info"
            >
              <div v-if="getAuthorResult(call).found" class="author-found">
                <span class="author-name">{{
                  getAuthorResult(call).name
                }}</span>
                <span class="author-mid"
                  >mid: {{ getAuthorResult(call).mid }}</span
                >
              </div>
              <div v-else class="author-not-found">未找到该作者</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, PropType } from 'vue';
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
    /** Whether this is displaying historical tool calls (from past conversation turns) */
    isHistorical: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['viewAllResults'],
  setup(props) {
    const expanded = ref<Record<number, boolean>>({});

    // ── Helper functions (must be declared BEFORE the watch to avoid TDZ) ──

    const getToolLabel = (type: string) => TOOL_LABELS[type] || type;
    const getToolIcon = (type: string) => TOOL_ICONS[type] || 'build';

    /** Extract query list from search_videos tool call args */
    const getQueryList = (call: ToolCall): string[] => {
      if (call.type !== 'search_videos') return [];
      const queries = call.args?.queries as string[] | undefined;
      return queries && Array.isArray(queries) ? queries : [];
    };

    const formatToolArgs = (call: ToolCall) => {
      if (call.type === 'check_author') {
        const name = call.args?.name as string | undefined;
        return name ? `"${name}"` : '';
      }
      return '';
    };

    /** Check if a tool call has displayable results */
    const hasResults = (call: ToolCall): boolean => {
      if (!call.result) return false;
      if (call.type === 'search_videos') {
        const result = call.result as Record<string, unknown>;
        // Single query format: {hits: [...]}
        if (
          Array.isArray(result?.hits) &&
          (result.hits as unknown[]).length > 0
        )
          return true;
        // Multi-query format: {results: [{hits: [...]}, ...]}
        if (Array.isArray(result?.results)) {
          return (result.results as Array<Record<string, unknown>>).some(
            (r) => Array.isArray(r.hits) && (r.hits as unknown[]).length > 0
          );
        }
        return false;
      }
      if (call.type === 'check_author') {
        return true; // Always show author result
      }
      return false;
    };

    /** 获取所有视频结果（合并所有 query 的结果） */
    const getAllVideoHits = (call: ToolCall): VideoHit[] => {
      if (call.type !== 'search_videos' || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      // Single query format
      if (Array.isArray(result.hits)) {
        return result.hits as VideoHit[];
      }
      // Multi-query format: merge all hits
      if (Array.isArray(result.results)) {
        const allHits: VideoHit[] = [];
        for (const r of result.results as Array<Record<string, unknown>>) {
          if (Array.isArray(r.hits)) {
            allHits.push(...(r.hits as VideoHit[]));
          }
        }
        return allHits;
      }
      return [];
    };

    /** 获取按 query 分组的搜索结果 */
    const getPerQueryResults = (
      call: ToolCall
    ): Array<{ query: string; hits: VideoHit[] }> => {
      if (call.type !== 'search_videos' || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      // Multi-query format
      if (Array.isArray(result.results)) {
        return (result.results as Array<Record<string, unknown>>).map((r) => ({
          query: String(r.query || ''),
          hits: Array.isArray(r.hits) ? (r.hits as VideoHit[]) : [],
        }));
      }
      // Single query format
      if (Array.isArray(result.hits)) {
        return [
          {
            query: String(result.query || ''),
            hits: result.hits as VideoHit[],
          },
        ];
      }
      return [];
    };

    const getResultCount = (call: ToolCall) => {
      if (call.type === 'search_videos') {
        const total = getAllVideoHits(call).length;
        return `${total} 条结果`;
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

    /** Normalize bilibili pic URL to include https: protocol */
    const normalizePicUrl = (pic: string): string => {
      if (!pic) return '';
      if (pic.startsWith('//')) return 'https:' + pic;
      if (pic.startsWith('http://')) return pic.replace('http://', 'https://');
      return pic;
    };

    /** Open video page on bilibili in new tab */
    const openVideoPage = (hit: VideoHit) => {
      if (hit.bvid) {
        window.open(
          `https://www.bilibili.com/video/${hit.bvid}`,
          '_blank',
          'noopener'
        );
      }
    };

    // ── Watch: Auto-expand completed search_videos calls with animation ──
    // 先设置为 false（确保 DOM 渲染出 0fr 状态），再通过 nextTick 延迟设为 true
    // 使 CSS grid-template-rows 过渡动画生效
    watch(
      () => props.toolCalls,
      (calls) => {
        calls.forEach((call, idx) => {
          if (
            call.type === 'search_videos' &&
            call.status === 'completed' &&
            hasResults(call) &&
            expanded.value[idx] === undefined
          ) {
            // 默认收起，用户可点击展开
            expanded.value[idx] = false;
          }
        });
      },
      { immediate: true, deep: true }
    );

    const toggleExpand = (idx: number) => {
      const call = props.toolCalls[idx];
      if (call?.status === 'completed' && hasResults(call)) {
        expanded.value[idx] = !expanded.value[idx];
      }
    };

    return {
      expanded,
      toggleExpand,
      getToolLabel,
      getToolIcon,
      getQueryList,
      formatToolArgs,
      hasResults,
      getResultCount,
      getVideoHits,
      getAllVideoHits,
      getPerQueryResults,
      getAuthorResult,
      normalizePicUrl,
      openVideoPage,
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

.tool-call-args-full {
  font-size: 12px;
  opacity: 0.5;
}

/* 多 query 子列表 */
.tool-query-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 12px 6px 34px;
}

.tool-query-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-query-icon {
  opacity: 0.35;
  flex-shrink: 0;
}

.tool-query-text {
  font-size: 12px;
  opacity: 0.55;
  line-height: 1.4;
  word-break: break-word;
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

/* 搜索结果折叠动画 */
.tool-call-results-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-call-results-wrapper.expanded {
  grid-template-rows: 1fr;
}

.tool-call-results-inner {
  overflow: hidden;
  min-height: 0;
}

/* 搜索结果预览 */
.tool-call-results {
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.08);
}

/* 按 query 分组的搜索结果 */
.per-query-section {
  margin-bottom: 10px;
  &:last-child {
    margin-bottom: 0;
  }
}

.per-query-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding: 4px 0;
}

.per-query-icon {
  opacity: 0.4;
  flex-shrink: 0;
}

.per-query-text {
  font-size: 12px;
  opacity: 0.6;
  font-weight: 500;
}

.per-query-count {
  font-size: 11px;
  opacity: 0.4;
  margin-left: 4px;
}

.tool-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.tool-result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;
  cursor: pointer;

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

.tool-result-cover-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(128, 128, 128, 0.35);
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

/* 操作按钮区域 */
.tool-result-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px dashed rgba(128, 128, 128, 0.12);
}

.tool-view-all-btn {
  font-size: 12px !important;
  opacity: 0.7;
  &:hover {
    opacity: 1;
  }
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
