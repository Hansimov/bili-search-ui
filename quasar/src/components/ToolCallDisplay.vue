<template>
  <div ref="containerRef" class="tool-call-container">
    <div
      v-for="(call, idx) in visibleToolCalls"
      :key="`${call.type}-${idx}`"
      class="tool-call-item"
      :class="{
        'tool-call-pending': call.status === 'pending',
        'tool-call-streaming': call.status === 'streaming',
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
            v-else-if="call.status === 'pending' || call.status === 'streaming'"
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
          <span
            v-if="!isCompactToolDisplay && call.type !== 'search_videos'"
            class="tool-call-args"
            >{{
            formatToolArgs(call)
          }}</span>
          <span
            v-else-if="
              !isCompactToolDisplay && getQueryList(call).length <= 1
            "
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
            v-else-if="call.status === 'streaming'"
            class="tool-call-status-streaming"
          >
            整理中...
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
            :label="
              isCompactToolDisplay
                ? undefined
                : `在新窗口中查看 ${getResultCount(call)}`
            "
            :title="`在新窗口中查看 ${getResultCount(call)}`"
            class="tool-view-all-btn"
            @click.stop="$emit('viewAllResults', call)"
          />
          <span
            v-else-if="
              call.status === 'completed' &&
              hasResults(call) &&
              call.type !== 'search_videos' &&
              !isAlwaysExpanded(call)
            "
            class="tool-call-status-completed"
          >
            {{ getResultCount(call) }}
          </span>
          <span
            v-else-if="call.status === 'completed' && isAlwaysExpanded(call)"
            class="tool-call-status-completed"
          >
            {{ getResultCount(call) }}
          </span>
          <q-icon
            v-if="isExpandable(call)"
            :name="expanded[idx] ? 'expand_less' : 'expand_more'"
            size="16px"
            class="tool-call-expand-icon"
          />
        </div>
      </div>

      <div
        v-if="
          !isCompactToolDisplay &&
          call.type === 'search_videos' &&
          getQueryList(call).length > 1
        "
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
        v-if="shouldRenderToolDetails(call)"
        class="tool-call-results-wrapper"
        :class="getResultsWrapperClasses(call, idx)"
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
              v-else-if="call.type === 'get_video_transcript'"
              class="tool-text-results"
            >
              <div class="tool-transcript-preview">
                {{ getTranscriptPreview(call) }}
              </div>
            </div>

            <div
              v-else-if="call.type === 'run_small_llm_task'"
              class="tool-text-results"
            >
              <pre
                class="tool-text-result"
                :class="getSmallTaskResultClasses(call)"
                @wheel="handleSmallTaskWheel($event, idx)"
                >{{ getSmallTaskResultText(call) }}</pre
              >
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
                <a
                  v-if="owner.mid"
                  class="tool-owner-mini-ref"
                  :href="getOwnerHref(owner.mid)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >
                  <span class="tool-owner-mini-meta">
                    <span class="tool-owner-mini-name">
                      {{ getOwnerDisplayName(owner) }}
                    </span>
                    <span class="tool-owner-mini-mid">
                      {{ getOwnerUidText(owner.mid) }}
                    </span>
                  </span>
                </a>
                <div
                  v-else
                  class="tool-owner-mini-ref tool-owner-mini-ref--disabled"
                >
                  <span class="tool-owner-mini-meta">
                    <span class="tool-owner-mini-name">
                      {{ getOwnerDisplayName(owner, '未命名作者') }}
                    </span>
                    <span v-if="owner.mid" class="tool-owner-mini-mid">
                      {{ getOwnerUidText(owner.mid) }}
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
import {
  computed,
  defineComponent,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  PropType,
} from 'vue';
import type { ToolCall } from 'src/services/chatService';
import {
  getOwnerDisplayName,
  getOwnerHref,
  getOwnerUidText,
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
  score?: number;
  sample_title?: string;
  sample_bvid?: string;
  sample_pic?: string;
  sample_view?: number;
  sources?: string[];
  face?: string;
}

interface TranscriptResult {
  title?: string;
  bvid?: string;
  requested_video_id?: string;
  selection?: {
    selected_text_length?: number;
    full_text_length?: number;
  };
  transcript?: {
    text?: string;
    text_length?: number;
    segment_count?: number;
  };
}

interface SmallTaskResult {
  task?: string;
  model?: string;
  model_name?: string;
  result?: string;
}

const DISPLAYABLE_INTERNAL_TOOLS = new Set(['run_small_llm_task']);
const COMPACT_TOOL_DISPLAY_QUERY = '(max-width: 620px), (pointer: coarse)';

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  search_owners: '搜索作者',
  check_author: '搜索作者',
  search_google: '搜索网页',
  get_video_transcript: '读取转写',
  run_small_llm_task: '小模型整理',
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
  get_video_transcript: 'subtitles',
  run_small_llm_task: 'smart_toy',
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
    const containerRef = ref<HTMLElement | null>(null);
    const expanded = ref<Record<number, boolean>>({});
    const previousStatuses = ref<Record<number, string | undefined>>({});
    const isCompactToolDisplay = ref(false);
    let compactMediaQuery: MediaQueryList | null = null;
    const visibleToolCalls = computed(() =>
      props.toolCalls.filter(
        (call) =>
          call.visibility !== 'internal' ||
          DISPLAYABLE_INTERNAL_TOOLS.has(call.type)
      )
    );

    // ── Helper functions (must be declared BEFORE the watch to avoid TDZ) ──

    const getToolLabel = (type: string) => TOOL_LABELS[type] || type;
    const getToolIcon = (type: string) => TOOL_ICONS[type] || 'build';

    const buildLookupQueryLabels = (call: ToolCall): string[] => {
      const labels: string[] = [];
      const bvids = [
        call.args?.bv,
        call.args?.bvid,
        ...(Array.isArray(call.args?.bvids)
          ? (call.args?.bvids as unknown[])
          : []),
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      const mids = [
        call.args?.mid,
        call.args?.uid,
        ...(Array.isArray(call.args?.mids)
          ? (call.args?.mids as unknown[])
          : []),
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      const dateWindow = String(call.args?.date_window || '').trim();

      bvids.forEach((bvid) => {
        if (!labels.includes(bvid)) {
          labels.push(bvid);
        }
      });
      mids.forEach((mid) => {
        const label = dateWindow
          ? `:uid=${mid} :date<=${dateWindow}`
          : `:uid=${mid}`;
        if (!labels.includes(label)) {
          labels.push(label);
        }
      });
      return labels;
    };

    /** Extract query list from search_videos tool call args */
    const getQueryList = (call: ToolCall): string[] => {
      if (call.type !== 'search_videos') return [];
      const queries = call.args?.queries as string[] | undefined;
      if (queries && Array.isArray(queries) && queries.length > 0) {
        return queries;
      }
      return buildLookupQueryLabels(call);
    };

    const formatToolArgs = (call: ToolCall) => formatToolCallArgs(call);

    const isAlwaysExpanded: (...args: unknown[]) => boolean = () => false;

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
      if (call.type === 'get_video_transcript') {
        const result = call.result as TranscriptResult;
        return !!(result?.transcript?.text || result?.title || result?.bvid);
      }
      if (call.type === 'run_small_llm_task') {
        const result = call.result as SmallTaskResult;
        return (
          call.status === 'streaming' ||
          (typeof result?.result === 'string' && result.result.length > 0)
        );
      }
      return false;
    };

    const canShowResults = (call: ToolCall): boolean =>
      hasResults(call) &&
      (call.status === 'streaming' || call.status === 'completed');

    const isExpandable = (call: ToolCall): boolean =>
      !isCompactToolDisplay.value &&
      canShowResults(call) &&
      !isAlwaysExpanded(call);

    const shouldRenderToolDetails = (call: ToolCall): boolean =>
      !isCompactToolDisplay.value && canShowResults(call);

    const getResultsWrapperClasses = (call: ToolCall, idx: number) => ({
      expanded: expanded.value[idx] || isAlwaysExpanded(call),
      'tool-call-results-wrapper--small-task':
        call.type === 'run_small_llm_task',
    });

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
      if (call.type === 'get_video_transcript') {
        const result = call.result as TranscriptResult;
        const selected = Number(
          result?.selection?.selected_text_length ||
            result?.transcript?.text_length ||
            0
        );
        const segments = Number(result?.transcript?.segment_count || 0);
        if (segments && selected) {
          return `${segments} 段 / ${selected} 字`;
        }
        if (selected) {
          return `${selected} 字`;
        }
        return '已读取';
      }
      if (call.type === 'run_small_llm_task') {
        return call.status === 'streaming' ? '输出中' : '已生成';
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

    const getTranscriptResult = (call: ToolCall): TranscriptResult => {
      if (call.type !== 'get_video_transcript' || !call.result) return {};
      return (call.result as TranscriptResult) || {};
    };

    const getTranscriptVideoId = (call: ToolCall): string => {
      const result = getTranscriptResult(call);
      return result.bvid || result.requested_video_id || '';
    };

    const getTranscriptPreview = (call: ToolCall): string => {
      const text = String(
        getTranscriptResult(call)?.transcript?.text || ''
      ).trim();
      if (!text) return '当前没有可展示的转写预览。';
      if (text.length <= 320) return text;
      return `${text.slice(0, 320).trimEnd()}...`;
    };

    const getSmallTaskResult = (call: ToolCall): SmallTaskResult => {
      if (call.type !== 'run_small_llm_task' || !call.result) return {};
      return (call.result as SmallTaskResult) || {};
    };

    const getSmallTaskResultText = (call: ToolCall): string => {
      const resultText = String(getSmallTaskResult(call)?.result || '').trim();
      if (resultText) {
        return resultText;
      }
      if (call.status === 'streaming') {
        return '小模型已开始整理，等待首批内容...';
      }
      return '';
    };

    const getSmallTaskResultClasses = (call: ToolCall) => ({
      'tool-text-result--small-task': true,
      'tool-text-result--small-task-streaming': call.status === 'streaming',
    });

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

    type ScrollAnchor = {
      itemEl: HTMLElement;
      scrollEl: HTMLElement;
      itemBottom: number;
      scrollTop: number;
    };

    const getToolItemElement = (idx: number): HTMLElement | null => {
      const items = containerRef.value?.querySelectorAll('.tool-call-item');
      return (items?.[idx] as HTMLElement | undefined) || null;
    };

    const getScrollableAncestor = (element: HTMLElement | null) => {
      let current = element?.parentElement || null;
      while (current) {
        if (current.classList.contains('chat-results-container')) {
          return current;
        }
        const style = window.getComputedStyle(current);
        if (
          /(auto|scroll)/.test(style.overflowY || '') &&
          current.scrollHeight > current.clientHeight
        ) {
          return current;
        }
        current = current.parentElement;
      }
      return document.scrollingElement as HTMLElement | null;
    };

    const captureScrollAnchor = (idx: number): ScrollAnchor | null => {
      const itemEl = getToolItemElement(idx);
      if (!itemEl) {
        return null;
      }
      const scrollEl = getScrollableAncestor(itemEl);
      if (!scrollEl) {
        return null;
      }
      return {
        itemEl,
        scrollEl,
        itemBottom: itemEl.getBoundingClientRect().bottom,
        scrollTop: scrollEl.scrollTop,
      };
    };

    const restoreScrollAnchors = (anchors: Array<ScrollAnchor | null>) => {
      const validAnchors = anchors.filter(
        (anchor): anchor is ScrollAnchor => !!anchor
      );
      if (validAnchors.length === 0) {
        return;
      }
      nextTick(() => {
        validAnchors.forEach((anchor) => {
          if (!anchor.itemEl.isConnected) {
            return;
          }
          const delta =
            anchor.itemEl.getBoundingClientRect().bottom - anchor.itemBottom;
          if (Math.abs(delta) > 1) {
            anchor.scrollEl.scrollTop = anchor.scrollTop + delta;
          }
        });
      });
    };

    const setExpandedWithAnchor = (idx: number, value: boolean) => {
      const anchor = captureScrollAnchor(idx);
      expanded.value[idx] = value;
      restoreScrollAnchors([anchor]);
    };

    const syncStreamingSmallTaskScrollPositions = () => {
      nextTick(() => {
        visibleToolCalls.value.forEach((call, idx) => {
          if (
            call.type !== 'run_small_llm_task' ||
            call.status !== 'streaming'
          ) {
            return;
          }
          const itemEl = getToolItemElement(idx);
          const resultEl = itemEl?.querySelector(
            '.tool-text-result--small-task'
          ) as HTMLElement | null;
          if (resultEl) {
            resultEl.scrollTop = resultEl.scrollHeight;
          }
        });
      });
    };

    const handleSmallTaskWheel = (event: WheelEvent, idx: number) => {
      const itemEl = getToolItemElement(idx);
      if (!itemEl) {
        return;
      }
      const scrollEl = getScrollableAncestor(itemEl);
      if (!scrollEl || scrollEl === event.currentTarget) {
        return;
      }
      event.preventDefault();
      scrollEl.scrollTop += event.deltaY;
    };

    // ── Watch: Auto-expand completed search_videos calls with animation ──
    // 先设置为 false（确保 DOM 渲染出 0fr 状态），再通过 nextTick 延迟设为 true
    // 使 CSS grid-template-rows 过渡动画生效
    watch(
      () =>
        visibleToolCalls.value.map((call) => {
          const smallTaskResult =
            call.type === 'run_small_llm_task'
              ? String(
                  (call.result as SmallTaskResult | undefined)?.result || ''
                )
              : '';
          return `${call.type}::${call.status}::${
            call.visibility || ''
          }::${smallTaskResult}`;
        }),
      () => {
        const calls = visibleToolCalls.value;
        const nextExpanded: Record<number, boolean> = {};
        const nextStatuses: Record<number, string | undefined> = {};
        const anchorsToRestore: Array<ScrollAnchor | null> = [];

        calls.forEach((call, idx) => {
          const previousExpanded = expanded.value[idx];
          const previousStatus = previousStatuses.value[idx];
          nextStatuses[idx] = call.status;

          if (call.type === 'run_small_llm_task') {
            if (call.status === 'streaming' && previousStatus !== 'streaming') {
              if (previousExpanded !== true) {
                anchorsToRestore.push(captureScrollAnchor(idx));
              }
              nextExpanded[idx] = true;
              return;
            }
            if (
              call.status === 'completed' &&
              previousStatus !== 'completed' &&
              hasResults(call)
            ) {
              if (previousExpanded !== false) {
                anchorsToRestore.push(captureScrollAnchor(idx));
              }
              nextExpanded[idx] = false;
              return;
            }
            if (previousExpanded !== undefined) {
              nextExpanded[idx] = previousExpanded;
              return;
            }
            if (call.status === 'completed' && hasResults(call)) {
              nextExpanded[idx] = false;
            }
            return;
          }

          if (previousExpanded !== undefined) {
            nextExpanded[idx] = previousExpanded;
            return;
          }
          if (
            call.status === 'completed' &&
            hasResults(call) &&
            nextExpanded[idx] === undefined
          ) {
            nextExpanded[idx] = false;
          }
        });

        expanded.value = nextExpanded;
        previousStatuses.value = nextStatuses;
        restoreScrollAnchors(anchorsToRestore);
        syncStreamingSmallTaskScrollPositions();
      },
      { immediate: true }
    );

    const toggleExpand = (idx: number) => {
      const call = visibleToolCalls.value[idx];
      if (call && isExpandable(call)) {
        setExpandedWithAnchor(idx, !expanded.value[idx]);
      }
    };

    /**
     * 收起结果，保持底部 bar 正下方在视口中的位置不变。
     * 锚点：tool-call-item 底部（即收起栏的正下方）。
     * 收起前记录该锚点在视口中的 Y 坐标，收起后调整 scrollTop
     * 使锚点恢复到完全相同的视口位置，实现零跳动。
     */
    const collapseAndScroll = (idx: number) => {
      setExpandedWithAnchor(idx, false);
    };

    const updateCompactToolDisplay = () => {
      isCompactToolDisplay.value = !!compactMediaQuery?.matches;
    };

    onMounted(() => {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      compactMediaQuery = window.matchMedia(COMPACT_TOOL_DISPLAY_QUERY);
      updateCompactToolDisplay();
      compactMediaQuery.addEventListener?.('change', updateCompactToolDisplay);
    });

    onBeforeUnmount(() => {
      compactMediaQuery?.removeEventListener?.(
        'change',
        updateCompactToolDisplay
      );
      compactMediaQuery = null;
    });

    return {
      containerRef,
      expanded,
      isCompactToolDisplay,
      visibleToolCalls,
      toggleExpand,
      collapseAndScroll,
      getToolLabel,
      getToolIcon,
      getQueryList,
      formatToolArgs,
      hasResults,
      canShowResults,
      shouldRenderToolDetails,
      isExpandable,
      isAlwaysExpanded,
      getResultsWrapperClasses,
      getResultCount,
      getVideoHits,
      getAllVideoHits,
      getPerQueryResults,
      getAuthorResult,
      getGoogleResults,
      getGoogleDisplayedUrl,
      getOwnerResults,
      getTranscriptResult,
      getTranscriptVideoId,
      getTranscriptPreview,
      getSmallTaskResultClasses,
      getSmallTaskResultText,
      getOwnerDisplayName,
      getOwnerHref,
      getOwnerUidText,
      handleSmallTaskWheel,
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

.tool-call-streaming {
  background: rgba(64, 144, 255, 0.04);
  border: 1px solid rgba(64, 144, 255, 0.14);
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
  overflow: hidden;
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
  flex: 0 0 auto;
  white-space: nowrap;
  word-break: keep-all;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex: 0 0 auto;
}

.tool-call-status-pending {
  font-size: 11px;
  color: inherit;
  opacity: 0.48;
}

.tool-call-status-streaming {
  font-size: 11px;
  color: rgba(64, 144, 255, 0.9);
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.tool-owner-result {
  display: flex;
  min-width: 0;
}

.tool-text-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-text-result-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-text-result-title {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.78;
}

.tool-text-result-submeta {
  font-size: 11px;
  opacity: 0.56;
}

.tool-text-result {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.08);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
  font-size: 12px;
}

.tool-text-result--small-task {
  overflow-anchor: none;
}

.tool-text-result--small-task-streaming {
  max-height: 84px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.tool-transcript-preview {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.08);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 12px;
}

.tool-owner-mini-ref {
  display: flex;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
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

.tool-owner-mini-ref--disabled {
  opacity: 0.78;
}

.tool-owner-mini-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tool-owner-mini-name {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  font-size: 14px;
  line-height: 1.42;
  font-weight: 600;
  opacity: 0.9;
}

.tool-owner-mini-mid {
  font-size: 12px;
  line-height: 1.42;
  opacity: 0.62;
}

@media (max-width: 780px) {
  .tool-owner-results {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .tool-owner-results {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .tool-owner-results {
    grid-template-columns: minmax(0, 1fr);
  }

  .tool-owner-mini-ref {
    padding: 7px 8px;
  }

  .tool-owner-mini-name {
    font-size: 13px;
  }

  .tool-owner-mini-mid {
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

@media (max-width: 620px), (pointer: coarse) {
  .tool-call-container {
    gap: 3px;
    margin: 4px 0;
  }

  .tool-call-item {
    border-radius: 7px;
  }

  .tool-call-header {
    min-height: 30px;
    padding: 5px 8px;
    cursor: default;
  }

  .tool-call-left {
    gap: 4px;
  }

  .tool-call-name {
    font-size: 11px;
    line-height: 1.2;
  }

  .tool-call-args,
  .tool-call-args-full,
  .tool-query-list,
  .tool-call-results-wrapper {
    display: none !important;
  }

  .tool-call-right {
    gap: 3px;
    margin-left: 6px;
  }

  .tool-call-status-pending,
  .tool-call-status-streaming,
  .tool-call-status-aborted,
  .tool-call-status-completed {
    font-size: 10px;
    white-space: nowrap;
  }

  .tool-view-all-btn {
    min-width: 24px !important;
    min-height: 24px !important;
    padding: 0 !important;
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
