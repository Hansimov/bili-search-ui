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
      <div class="tool-call-header" @click="toggleExpand(idx)">
        <div class="tool-call-left">
          <q-icon
            v-if="isAborted && call.status === 'pending'"
            name="block"
            size="14px"
            class="tool-call-icon tool-call-aborted-icon"
          />
          <q-spinner-dots
            v-else-if="call.status === 'pending'"
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
          >
            {{ getQueryList(call)[0] || '' }}
          </span>
        </div>
        <div class="tool-call-right">
          <span
            v-if="isAborted && call.status === 'pending'"
            class="tool-call-status-aborted"
          >
            已中止
          </span>
          <span
            v-else-if="call.status === 'pending'"
            class="tool-call-status-pending"
          >
            执行中...
          </span>
          <q-btn
            v-if="
              call.type === 'search_videos' &&
              call.status === 'completed' &&
              hasResults(call)
            "
            flat
            dense
            no-caps
            size="sm"
            icon="tab"
            :label="`在新窗口中查看 ${getResultCount(call)}`"
            class="tool-view-all-btn"
            @click.stop="$emit('viewAllResults', call)"
          />
          <span
            v-else-if="
              call.status === 'completed' &&
              hasResults(call) &&
              call.type !== 'search_videos'
            "
            class="tool-call-status-completed"
          >
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

      <div
        v-if="call.status === 'completed' && hasResults(call)"
        class="tool-call-results-wrapper"
        :class="{ expanded: expanded[idx] }"
      >
        <div class="tool-call-results-inner">
          <div class="tool-call-results">
            <div v-if="call.type === 'search_videos'">
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

              <div
                v-if="getAllVideoHits(call).length > 0"
                class="tool-result-collapse-bar"
                @click.stop="collapseAndScroll(idx)"
              >
                <q-icon
                  name="expand_less"
                  size="18px"
                  class="collapse-bar-icon"
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

            <div
              v-else-if="call.type === 'search_google'"
              class="tool-google-results"
            >
              <a
                v-for="(result, ridx) in getGoogleResults(call)"
                :key="result.link || ridx"
                class="tool-google-result"
                :href="result.link || '#'"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
              >
                <div
                  v-if="getGoogleDisplayedUrl(result)"
                  class="tool-google-result-topline"
                >
                  <span class="tool-google-result-source">{{
                    getGoogleDisplayedUrl(result)
                  }}</span>
                  <q-icon
                    name="open_in_new"
                    size="12px"
                    class="tool-google-result-open"
                  />
                </div>
                <div class="tool-google-result-title">
                  {{ result.title || result.link }}
                </div>
                <div v-if="result.snippet" class="tool-google-result-snippet">
                  {{ result.snippet }}
                </div>
              </a>
            </div>

            <div
              v-else-if="call.type === 'search_owners'"
              class="tool-owner-results"
            >
              <div
                v-for="(owner, oidx) in getOwnerResults(call)"
                :key="`${owner.mid || owner.name || 'owner'}-${oidx}`"
                class="tool-owner-result"
              >
                <div class="tool-owner-result-rank">#{{ oidx + 1 }}</div>
                <a
                  v-if="owner.mid"
                  class="bili-owner-compact-ref tool-owner-compact-ref"
                  :href="getOwnerHref(owner.mid)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >
                  <span
                    class="bili-owner-compact-cover-wrap tool-owner-compact-cover-wrap"
                  >
                    <img
                      v-if="getOwnerAvatarUrl(owner)"
                      :src="getOwnerAvatarUrl(owner)"
                      class="bili-owner-compact-cover tool-owner-compact-cover"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <span
                      v-else
                      class="bili-owner-compact-cover bili-owner-compact-cover-placeholder tool-owner-compact-cover tool-owner-compact-cover--placeholder"
                    >
                      <q-icon name="person" size="18px" />
                    </span>
                  </span>
                  <span class="bili-owner-compact-meta tool-owner-compact-meta">
                    <span
                      class="bili-owner-compact-title tool-owner-compact-title"
                    >
                      {{ getOwnerDisplayName(owner) }}
                    </span>
                    <span
                      v-if="getOwnerCompactStats(owner)"
                      class="bili-owner-compact-stats tool-owner-compact-stats"
                    >
                      {{ getOwnerCompactStats(owner) }}
                    </span>
                    <span
                      v-if="owner.sign"
                      class="bili-owner-compact-sign tool-owner-compact-sign"
                    >
                      {{ owner.sign }}
                    </span>
                  </span>
                </a>
                <div
                  v-else
                  class="bili-owner-compact-ref tool-owner-compact-ref tool-owner-compact-ref--disabled"
                >
                  <span
                    class="bili-owner-compact-cover-wrap tool-owner-compact-cover-wrap"
                  >
                    <span
                      class="bili-owner-compact-cover bili-owner-compact-cover-placeholder tool-owner-compact-cover tool-owner-compact-cover--placeholder"
                    >
                      <q-icon name="person" size="18px" />
                    </span>
                  </span>
                  <span class="bili-owner-compact-meta tool-owner-compact-meta">
                    <span
                      class="bili-owner-compact-title tool-owner-compact-title"
                    >
                      {{ getOwnerDisplayName(owner, '未命名作者') }}
                    </span>
                    <span
                      v-if="getOwnerCompactStats(owner)"
                      class="bili-owner-compact-stats tool-owner-compact-stats"
                    >
                      {{ getOwnerCompactStats(owner) }}
                    </span>
                    <span
                      v-if="owner.sign"
                      class="bili-owner-compact-sign tool-owner-compact-sign"
                    >
                      {{ owner.sign }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick, PropType } from 'vue';
import type { ToolCall } from 'src/services/chatService';
import {
  getOwnerAvatarUrl,
  getOwnerDisplayName,
  getOwnerHref,
  getOwnerStatLine,
} from 'src/utils/ownerRichView';
import { normalizeVideoHit, normalizeVideoPicUrl } from 'src/utils/videoHit';
import { formatToolCallArgs } from 'src/utils/toolCall';

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

interface GoogleResult {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_url?: string;
  display_link?: string;
}

interface OwnerResult {
  mid?: number;
  name?: string;
  sign?: string;
  fans?: number;
  score?: number;
  sample_title?: string;
  sample_bvid?: string;
  sample_pic?: string;
  sample_view?: number;
  sources?: string[];
  face?: string;
}

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  search_owners: '搜索作者',
  check_author: '搜索作者',
  search_google: '搜索网页',
  related_tokens_by_tokens: '相关词补全',
  related_owners_by_tokens: '相关作者',
  related_videos_by_videos: '相关视频',
  related_owners_by_videos: '相关作者',
  related_videos_by_owners: '作者相关视频',
  related_owners_by_owners: '相关作者',
  read_spec: '阅读文档',
};

/** 工具图标 */
const TOOL_ICONS: Record<string, string> = {
  search_videos: 'search',
  search_owners: 'person_search',
  check_author: 'person_search',
  search_google: 'travel_explore',
  related_tokens_by_tokens: 'token',
  related_owners_by_tokens: 'group',
  related_videos_by_videos: 'linked_camera',
  related_owners_by_videos: 'group_work',
  related_videos_by_owners: 'video_library',
  related_owners_by_owners: 'groups',
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
    /** Whether the current request has been aborted by the user */
    isAborted: {
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

    const formatToolArgs = (call: ToolCall) => formatToolCallArgs(call);

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
      if (call.type === 'search_google') {
        const result = call.result as Record<string, unknown>;
        return Array.isArray(result?.results) && result.results.length > 0;
      }
      if (call.type === 'search_owners') {
        const result = call.result as Record<string, unknown>;
        return Array.isArray(result?.owners) && result.owners.length > 0;
      }
      return false;
    };

    /** 获取所有视频结果（合并所有 query 的结果） */
    const getAllVideoHits = (call: ToolCall): VideoHit[] => {
      if (call.type !== 'search_videos' || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      // Single query format
      if (Array.isArray(result.hits)) {
        return (result.hits as VideoHit[]).map((hit) => normalizeVideoHit(hit));
      }
      // Multi-query format: merge all hits
      if (Array.isArray(result.results)) {
        const allHits: VideoHit[] = [];
        for (const r of result.results as Array<Record<string, unknown>>) {
          if (Array.isArray(r.hits)) {
            allHits.push(
              ...(r.hits as VideoHit[]).map((hit) => normalizeVideoHit(hit))
            );
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
          hits: Array.isArray(r.hits)
            ? (r.hits as VideoHit[]).map((hit) => normalizeVideoHit(hit))
            : [],
        }));
      }
      // Single query format
      if (Array.isArray(result.hits)) {
        return [
          {
            query: String(result.query || ''),
            hits: (result.hits as VideoHit[]).map((hit) =>
              normalizeVideoHit(hit)
            ),
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
      if (call.type === 'search_google') {
        const result = call.result as Record<string, unknown>;
        const total = Number(
          result?.result_count || getGoogleResults(call).length || 0
        );
        return `${total} 条结果`;
      }
      if (call.type === 'search_owners') {
        const result = call.result as Record<string, unknown>;
        const total = Number(
          result?.total_owners || getOwnerResults(call).length || 0
        );
        return `${total} 位作者`;
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

    const getGoogleResults = (call: ToolCall): GoogleResult[] => {
      if (call.type !== 'search_google' || !call.result) return [];
      const results = (call.result as Record<string, unknown>)?.results;
      return Array.isArray(results) ? (results as GoogleResult[]) : [];
    };

    const getGoogleDisplayedUrl = (result: GoogleResult): string => {
      return result.displayed_url || result.display_link || '';
    };

    const getOwnerResults = (call: ToolCall): OwnerResult[] => {
      if (call.type !== 'search_owners' || !call.result) return [];
      const owners = (call.result as Record<string, unknown>)?.owners;
      return Array.isArray(owners) ? (owners as OwnerResult[]) : [];
    };

    const getOwnerCompactStats = (owner: OwnerResult): string => {
      return getOwnerStatLine(
        {
          mid: owner.mid ? String(owner.mid) : '',
          fans: owner.fans,
        },
        { includeUid: true }
      );
    };

    /** Normalize bilibili pic URL to include https: protocol */
    const normalizePicUrl = (pic: string): string => {
      return normalizeVideoPicUrl(pic);
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

    /**
     * 收起结果，保持底部 bar 正下方在视口中的位置不变。
     * 锚点：tool-call-item 底部（即收起栏的正下方）。
     * 收起前记录该锚点在视口中的 Y 坐标，收起后调整 scrollTop
     * 使锚点恢复到完全相同的视口位置，实现零跳动。
     */
    const collapseAndScroll = (idx: number) => {
      const container = document.querySelector('.tool-call-container');
      if (!container) {
        expanded.value[idx] = false;
        return;
      }
      const items = container.querySelectorAll('.tool-call-item');
      const el = items[idx] as HTMLElement | undefined;
      if (!el) {
        expanded.value[idx] = false;
        return;
      }
      // 记录收起前锚点（item 底部）在视口中的 Y 坐标
      const anchorViewportY = el.getBoundingClientRect().bottom;
      expanded.value[idx] = false;
      nextTick(() => {
        // 收起后锚点（item 底部）在视口中的新 Y 坐标
        const newAnchorViewportY = el.getBoundingClientRect().bottom;
        // 调整 scrollTop 使锚点恢复到原来的视口位置
        const delta = newAnchorViewportY - anchorViewportY;
        if (Math.abs(delta) > 1) {
          document.documentElement.scrollTop += delta;
        }
      });
    };

    return {
      expanded,
      toggleExpand,
      collapseAndScroll,
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
      getGoogleResults,
      getGoogleDisplayedUrl,
      getOwnerResults,
      getOwnerAvatarUrl,
      getOwnerDisplayName,
      getOwnerHref,
      getOwnerCompactStats,
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
  gap: 4px;
  margin: 6px 0;
}

.tool-call-item {
  border-radius: 8px;
  overflow: hidden;
  transition: background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}

.tool-call-pending {
  background: rgba(128, 128, 128, 0.028);
  border: 1px dashed rgba(128, 128, 128, 0.12);
}

.tool-call-completed {
  background: rgba(128, 128, 128, 0.022);
  border: 1px solid rgba(128, 128, 128, 0.08);
}

.tool-call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
  opacity: 0.78;

  &:hover {
    background: rgba(128, 128, 128, 0.04);
    opacity: 0.88;
  }
}

.tool-call-left {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.tool-call-spinner {
  opacity: 0.42;
  color: currentColor;
}

.tool-call-icon {
  opacity: 0.48;
}

.tool-call-name {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.72;
}

.tool-call-args {
  font-size: 11px;
  opacity: 0.42;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.tool-call-args-full {
  font-size: 11px;
  opacity: 0.42;
}

/* 多 query 子列表 */
.tool-query-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 1px 10px 5px 30px;
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
  font-size: 11px;
  opacity: 0.48;
  line-height: 1.4;
  word-break: break-word;
}

.tool-call-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.tool-call-status-pending {
  font-size: 11px;
  color: inherit;
  opacity: 0.48;
}

.tool-call-status-aborted {
  font-size: 11px;
  opacity: 0.42;
  color: inherit;
}

.tool-call-aborted-icon {
  opacity: 0.45;
}

.tool-call-status-completed {
  font-size: 11px;
  opacity: 0.42;
}

.tool-call-expand-icon {
  opacity: 0.32;
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
  padding: 6px 10px 10px;
  border-top: 1px solid rgba(128, 128, 128, 0.06);
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
  margin-bottom: 4px;
  padding: 2px 0;
}

.per-query-icon {
  opacity: 0.4;
  flex-shrink: 0;
}

.per-query-text {
  font-size: 11px;
  opacity: 0.52;
  font-weight: 500;
}

.per-query-count {
  font-size: 11px;
  opacity: 0.36;
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

.tool-google-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-owner-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-owner-result {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  column-gap: 10px;
  align-items: stretch;
}

.tool-owner-result {
  padding: 0;
  border-radius: 0;
  background: transparent;
}

.tool-owner-result-rank {
  display: inline-flex;
  align-self: center;
  justify-content: center;
  min-width: 34px;
  padding: 4px 6px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.08);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 600;
  opacity: 0.72;
  text-align: center;
}

.tool-owner-compact-ref {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.08);
  background: rgba(128, 128, 128, 0.025);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.05);
    border-color: rgba(128, 128, 128, 0.12);
    text-decoration: none;
  }
}

.tool-owner-compact-ref--disabled {
  opacity: 0.82;
}

.tool-owner-compact-cover-wrap {
  width: 46px;
  min-width: 46px;
  height: 46px;
  aspect-ratio: 1;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.08);
}

.tool-owner-compact-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tool-owner-compact-cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(128, 128, 128, 0.35);
  background: rgba(128, 128, 128, 0.08);
}

.tool-owner-compact-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  justify-content: center;
  gap: 3px;
}

.tool-owner-compact-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 14px;
  line-height: 1.42;
  font-weight: 600;
  opacity: 0.9;
}

.tool-owner-compact-stats,
.tool-owner-compact-sign {
  font-size: 12px;
  line-height: 1.42;
  opacity: 0.7;
}

.tool-owner-compact-sign {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 780px) {
  .tool-owner-result {
    grid-template-columns: 48px minmax(0, 1fr);
    column-gap: 10px;
  }

  .tool-owner-compact-cover-wrap {
    width: 42px;
    min-width: 42px;
    height: 42px;
  }
}

@media (max-width: 620px) {
  .tool-owner-result {
    grid-template-columns: 44px minmax(0, 1fr);
    column-gap: 8px;
  }

  .tool-owner-result-rank {
    align-self: center;
  }
}

@media (max-width: 460px) {
  .tool-owner-compact-ref {
    gap: 10px;
    padding: 7px 8px;
  }

  .tool-owner-compact-cover-wrap {
    width: 38px;
    min-width: 38px;
    height: 38px;
  }

  .tool-owner-compact-title {
    font-size: 13px;
  }

  .tool-owner-compact-stats,
  .tool-owner-compact-sign {
    font-size: 11px;
  }
}

.tool-google-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
  }
}

.tool-google-result-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tool-google-result-source {
  font-size: 11px;
  opacity: 0.48;
}

.tool-google-result-open {
  opacity: 0.35;
  flex-shrink: 0;
}

.tool-google-result-title {
  font-size: 13px;
  line-height: 1.35;
  font-weight: 500;
  opacity: 0.88;
}

.tool-google-result-snippet {
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.62;
}

.tool-result-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  font-size: 12px;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
    opacity: 0.68;
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

/* 在新窗口中查看按钮（header 中） */
.tool-view-all-btn {
  font-size: 11px !important;
  min-height: 22px;
  padding: 0 2px;
  color: inherit;
  opacity: 0.46;
  &:hover {
    opacity: 0.68;
  }
}

/* 底部收起栏 */
.tool-result-collapse-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  margin-top: 4px;
  border-top: 1px dashed rgba(128, 128, 128, 0.08);
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: 0 0 6px 6px;

  &:hover {
    background: rgba(128, 128, 128, 0.04);
  }
}

.collapse-bar-icon {
  opacity: 0.35;
  transition: opacity 0.15s ease;

  .tool-result-collapse-bar:hover & {
    opacity: 0.6;
  }
}

/* Dark theme */
body.body--dark {
  .tool-call-pending {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.07);
  }

  .tool-call-completed {
    background: rgba(255, 255, 255, 0.015);
    border-color: rgba(255, 255, 255, 0.06);
  }

  .tool-call-header:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .tool-result-item {
    background: rgba(255, 255, 255, 0.02);
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .tool-google-result {
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
