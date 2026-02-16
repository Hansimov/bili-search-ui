<!--
  VideoSnapshotViewer - 视频快照查看器

  全功能快照浏览对话框，支持：
  - 加载和显示视频快照（调用 Bilibili 视频快照 API，带自动重试）
  - 懒加载拼版图（首次加载 INITIAL_SHEETS_LIMIT 张，按需加载更多）
  - 放大显示当前帧（自适应缩放）
  - 时间线缩略图（底部或左侧，可切换布局）
  - 键盘导航 + 鼠标滚轮切换帧
  - 显示视频信息（UP主、发布时间、简介、统计数据）
  - 点击跳转到 Bilibili 对应时间点（支持分P参数）
-->
<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    @show="onDialogShow"
    @keydown="onKeydown"
    transition-show="fade"
    transition-hide="fade"
  >
    <q-card class="snapshot-viewer column no-wrap" ref="viewerCardRef">
      <!-- ─── Header ─────────────────────────────────────── -->
      <q-toolbar class="snapshot-viewer-header">
        <q-toolbar-title class="snapshot-viewer-title">
          {{ title }}
        </q-toolbar-title>

        <!-- Toggle timeline visibility: icon shows current state -->
        <q-btn
          flat
          round
          dense
          :icon="showTimeline ? 'view_sidebar' : 'photo_size_select_large'"
          color="grey-4"
          class="q-mr-xs"
          @click="showTimeline = !showTimeline"
        >
          <q-tooltip :delay="400">
            {{ showTimeline ? '收起缩略图' : '展开缩略图' }}
          </q-tooltip>
        </q-btn>

        <!-- Layout toggle: icon shows current layout state -->
        <q-btn
          flat
          round
          dense
          :icon="layout === 'left' ? 'view_sidebar' : 'view_stream'"
          color="grey-4"
          class="q-mr-xs"
          @click="toggleLayout"
        >
          <q-tooltip :delay="400">
            {{ layout === 'bottom' ? '切换为侧边时间线' : '切换为底部时间线' }}
          </q-tooltip>
        </q-btn>

        <q-btn flat round dense icon="close" color="grey-4" @click="close" />
      </q-toolbar>

      <!-- ─── Video Info Bar ─────────────────────────────────── -->
      <div class="snapshot-info-bar" v-if="result">
        <div class="info-bar-row">
          <a
            v-if="result.owner"
            :href="`https://space.bilibili.com/${result.owner.mid}/video`"
            target="_blank"
            class="info-uploader"
          >
            {{ result.owner.name }}
          </a>
          <span v-if="result.pubdate" class="info-divider">·</span>
          <span v-if="result.pubdate" class="info-date">
            {{ tsToYmd(result.pubdate) }}
          </span>
        </div>
        <div class="info-stats-row" v-if="result.stat">
          <span class="info-stat-item">
            <span class="stat-label">播放</span>
            <span class="stat-value">{{
              humanReadableNumber(result.stat.view)
            }}</span>
          </span>
          <span class="info-stat-item">
            <span class="stat-label">点赞</span>
            <span class="stat-value">{{
              humanReadableNumber(result.stat.like)
            }}</span>
          </span>
          <span class="info-stat-item">
            <span class="stat-label">投币</span>
            <span class="stat-value">{{
              humanReadableNumber(result.stat.coin)
            }}</span>
          </span>
          <span class="info-stat-item">
            <span class="stat-label">收藏</span>
            <span class="stat-value">{{
              humanReadableNumber(result.stat.favorite)
            }}</span>
          </span>
          <span class="info-stat-item">
            <span class="stat-label">弹幕</span>
            <span class="stat-value">{{
              humanReadableNumber(result.stat.danmaku)
            }}</span>
          </span>
          <span class="info-stat-item">
            <span class="stat-label">评论</span>
            <span class="stat-value">{{
              humanReadableNumber(result.stat.reply)
            }}</span>
          </span>
        </div>
        <!-- Description (collapsible, overlays content below) -->
        <div
          class="snapshot-desc-wrapper"
          v-if="result?.desc && result.desc !== '-'"
        >
          <div
            class="snapshot-desc"
            :class="{ 'snapshot-desc-expanded': descExpanded }"
            @click="descExpanded = !descExpanded"
            :title="descExpanded ? '点击收起' : '点击展开'"
          >
            {{ result.desc }}
          </div>
        </div>
      </div>

      <!-- ─── Loading ────────────────────────────────────── -->
      <div v-if="loading" class="col flex flex-center column">
        <q-spinner-dots size="40px" color="blue-4" />
        <div class="q-mt-md snapshot-status-text">
          {{
            retryCount > 0
              ? `正在重试 (${retryCount}/${MAX_RETRIES})...`
              : '正在加载视频快照...'
          }}
        </div>
      </div>

      <!-- ─── Error ──────────────────────────────────────── -->
      <div v-else-if="error" class="col flex flex-center column">
        <q-icon name="warning" size="48px" color="negative" />
        <div class="q-mt-md text-negative">{{ error }}</div>
        <q-btn
          flat
          label="重试"
          color="primary"
          class="q-mt-sm"
          @click="loadVideoshot"
        />
      </div>

      <!-- ─── Main Content ───────────────────────────────── -->
      <template v-else-if="videoshotData && videoshotData.totalFrames > 0">
        <div
          class="snapshot-body col"
          :class="
            layout === 'left' ? 'snapshot-body-left' : 'snapshot-body-bottom'
          "
        >
          <!-- Timeline (left layout: PPT-like thumbnail panel) -->
          <div
            v-if="layout === 'left' && showTimeline"
            class="snapshot-timeline-left"
          >
            <SnapshotTimeline
              :data="videoshotData"
              :currentIndex="currentIndex"
              :thumbScale="timelineScale"
              :direction="'vertical'"
              :loadedSheetIndices="videoshotData.loadedSheetIndices"
              @select="goToFrame"
              @need-sheets="onNeedSheets"
            />
          </div>

          <!-- Main area: frame + controls -->
          <div class="snapshot-main-area col flex column">
            <!-- Frame with nav -->
            <div class="snapshot-frame-region col flex flex-center">
              <div class="snapshot-frame-wrapper flex items-center">
                <q-btn
                  flat
                  round
                  icon="chevron_left"
                  size="lg"
                  class="nav-btn"
                  :disable="currentIndex <= 0"
                  @click="prevFrame"
                />
                <div class="snapshot-frame-column">
                  <!-- Frame counter (tight above preview) -->
                  <div class="snapshot-frame-counter" v-if="videoshotData">
                    <span class="frame-idx">{{ currentIndex + 1 }}</span>
                    <span class="frame-sep">/</span>
                    <span class="frame-total">{{
                      videoshotData.totalFrames
                    }}</span>
                  </div>
                  <SnapshotFrameDisplay
                    v-if="currentFrame"
                    :frame="currentFrame"
                    :scale="mainScale"
                    class="snapshot-main-frame"
                  />
                  <!-- Timestamp bar (tight below preview) -->
                  <div class="snapshot-time-bar">
                    <a
                      :href="currentBilibiliUrl"
                      target="_blank"
                      class="time-link"
                      title="点击在B站打开此时间点"
                    >
                      <span class="time-current">{{
                        currentTimestampStr
                      }}</span>
                      <span class="time-sep">/</span>
                      <span class="time-total">{{ totalDurationStr }}</span>
                      <q-icon
                        name="open_in_new"
                        size="11px"
                        class="time-jump-icon"
                      />
                    </a>
                  </div>
                </div>
                <q-btn
                  flat
                  round
                  icon="chevron_right"
                  size="lg"
                  class="nav-btn"
                  :disable="
                    !videoshotData ||
                    currentIndex >= videoshotData.totalFrames - 1
                  "
                  @click="nextFrame"
                />
              </div>
            </div>

            <!-- Keyboard shortcuts hint -->
            <div class="snapshot-shortcuts-hint">
              ← → 滚轮切换帧 · PgUp/PgDn 跳10帧 · Home/End 首尾帧
            </div>
          </div>

          <!-- Timeline (bottom layout) -->
          <div
            v-if="layout === 'bottom' && showTimeline"
            class="snapshot-timeline-bottom"
          >
            <SnapshotTimeline
              :data="videoshotData"
              :currentIndex="currentIndex"
              :thumbScale="timelineScale"
              :direction="'horizontal'"
              :loadedSheetIndices="videoshotData.loadedSheetIndices"
              @select="goToFrame"
              @need-sheets="onNeedSheets"
            />
          </div>
        </div>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import SnapshotFrameDisplay from './SnapshotFrameDisplay.vue';
import SnapshotTimeline from './SnapshotTimeline.vue';
import {
  fetchVideoshot,
  getFrameInfo,
  formatTimestamp,
  buildBilibiliUrl,
  MAX_RETRIES,
  type VideoshotData,
  type FrameInfo,
} from 'src/services/videoshotService';
import { humanReadableNumber } from 'src/utils/convert';
import { tsToYmd } from 'src/utils/convert';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = Record<string, any>;

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    bvid: string;
    title: string;
    /** 完整的搜索结果对象，用于显示视频信息 */
    result?: Dict;
    cid?: number;
    page?: number;
  }>(),
  {
    page: 1,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// ── State ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const error = ref('');
const showTimeline = ref(true);
const retryCount = ref(0);
const videoshotData = ref<VideoshotData | null>(null);
const currentIndex = ref(0);
const layout = ref<'bottom' | 'left'>('left');
const descExpanded = ref(false);

// ── Window size tracking for responsive layout ────────────────────────
const windowWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : 1024
);
const windowHeight = ref(
  typeof window !== 'undefined' ? window.innerHeight : 768
);
const onWindowResize = () => {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;
};

// ── Computed: current frame ────────────────────────────────────────────────
const currentFrame = computed<FrameInfo | null>(() => {
  if (!videoshotData.value) return null;
  return getFrameInfo(videoshotData.value, currentIndex.value);
});

const currentTimestampStr = computed(() => {
  if (!currentFrame.value) return '00:00';
  return formatTimestamp(currentFrame.value.timestamp);
});

const totalDurationStr = computed(() => {
  if (!videoshotData.value || videoshotData.value.totalFrames === 0)
    return '00:00';
  const lastTs =
    videoshotData.value.timestamps[videoshotData.value.totalFrames - 1] ?? 0;
  return formatTimestamp(lastTs);
});

const currentBilibiliUrl = computed(() => {
  if (!currentFrame.value) return '#';
  return buildBilibiliUrl(props.bvid, currentFrame.value.timestamp, props.page);
});

// ── Computed: responsive scales ────────────────────────────────────────────
/** Width of the left timeline panel (px) */
const LEFT_PANEL_WIDTH = 180;

const mainScale = computed(() => {
  if (!videoshotData.value) return 4;
  const dialogWidth = Math.min(windowWidth.value * 0.9, 1100);
  const sideOffset =
    layout.value === 'left' && showTimeline.value ? LEFT_PANEL_WIDTH + 20 : 0;
  const navBtnsWidth = 120;
  const padding = 40;
  const maxWidth = dialogWidth - sideOffset - navBtnsWidth - padding;
  const dialogHeight = Math.min(windowHeight.value * 0.85, 800);
  const overhead = 180;
  const timelineH = layout.value === 'bottom' && showTimeline.value ? 150 : 0;
  const maxHeight = Math.max(dialogHeight - overhead - timelineH, 120);
  const scaleX = maxWidth / videoshotData.value.imgXSize;
  const scaleY = maxHeight / videoshotData.value.imgYSize;
  return Math.min(scaleX, scaleY, 6);
});

const timelineScale = computed(() => {
  if (!videoshotData.value) return 0.65;
  if (layout.value === 'left') {
    const availableWidth = LEFT_PANEL_WIDTH - 20;
    return availableWidth / videoshotData.value.imgXSize;
  }
  // Bottom layout: adjust for narrow windows
  const dialogWidth = Math.min(windowWidth.value * 0.9, 1100);
  if (dialogWidth < 600) return 0.4;
  if (dialogWidth < 800) return 0.5;
  return 0.65;
});

// ── Navigation ─────────────────────────────────────────────────────────────
const prevFrame = () => {
  if (currentIndex.value > 0) currentIndex.value--;
};

const nextFrame = () => {
  if (
    videoshotData.value &&
    currentIndex.value < videoshotData.value.totalFrames - 1
  ) {
    currentIndex.value++;
  }
};

const goToFrame = (index: number) => {
  currentIndex.value = index;
};

const close = () => {
  emit('update:modelValue', false);
};

const toggleLayout = () => {
  layout.value = layout.value === 'bottom' ? 'left' : 'bottom';
};

// ── Mouse wheel ────────────────────────────────────────────────────────────
const viewerCardRef = ref<HTMLElement | null>(null);
const onWheel = (e: WheelEvent) => {
  if (e.deltaY > 0) nextFrame();
  else if (e.deltaY < 0) prevFrame();
};

// ── Keyboard handling ──────────────────────────────────────────────────────
const onKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      prevFrame();
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault();
      nextFrame();
      break;
    case 'Home':
      e.preventDefault();
      currentIndex.value = 0;
      break;
    case 'End':
      e.preventDefault();
      if (videoshotData.value)
        currentIndex.value = videoshotData.value.totalFrames - 1;
      break;
    case 'PageUp':
      e.preventDefault();
      currentIndex.value = Math.max(0, currentIndex.value - 10);
      break;
    case 'PageDown':
      e.preventDefault();
      if (videoshotData.value) {
        currentIndex.value = Math.min(
          videoshotData.value.totalFrames - 1,
          currentIndex.value + 10
        );
      }
      break;
  }
};

// ── Lazy loading: preload sprite sheet images ──────────────────────────────
/**
 * 预加载指定拼版图序号列表的图片（带单图重试）
 */
const PRELOAD_RETRY = 2;
const preloadSheets = (
  data: VideoshotData,
  indices: number[]
): Promise<void[]> => {
  const promises = indices
    .filter((i) => i < data.totalSheets && !data.loadedSheetIndices.has(i))
    .map((i) => {
      return new Promise<void>((resolve) => {
        let attempt = 0;
        const tryLoad = () => {
          const img = new Image();
          img.referrerPolicy = 'no-referrer';
          img.onload = () => {
            data.loadedSheetIndices.add(i);
            resolve();
          };
          img.onerror = () => {
            attempt++;
            if (attempt <= PRELOAD_RETRY) {
              // Retry with cache-busting
              setTimeout(() => {
                const sep = data.images[i].includes('?') ? '&' : '?';
                img.src = `${data.images[i]}${sep}_r=${attempt}`;
              }, 500 * attempt);
            } else {
              // Give up but still mark as loaded to allow component-level retry
              data.loadedSheetIndices.add(i);
              resolve();
            }
          };
          img.src = data.images[i];
        };
        tryLoad();
      });
    });
  return Promise.all(promises);
};

/**
 * 首次加载：预加载前 2 张拼版图，其余由懒加载处理
 */
const initialPreload = async (data: VideoshotData) => {
  const count = Math.min(2, data.totalSheets);
  const indices = Array.from({ length: count }, (_, i) => i);
  await preloadSheets(data, indices);
};

/**
 * 懒加载：当时间线显示需要新拼版图时自动预加载
 */
const onNeedSheets = async (indices: number[]) => {
  if (!videoshotData.value) return;
  await preloadSheets(videoshotData.value, indices);
};

// ── Data loading ───────────────────────────────────────────────────────────
const loadVideoshot = async () => {
  loading.value = true;
  error.value = '';
  retryCount.value = 0;
  currentIndex.value = 0;

  // Intercept retry counting by wrapping fetchVideoshot progress
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const msg = String(args[0] || '');
    if (msg.includes('快照加载失败')) {
      retryCount.value++;
    }
    originalWarn.apply(console, args);
  };

  try {
    videoshotData.value = await fetchVideoshot(props.bvid, props.cid);
    // Preload initial batch of sprite sheets
    await initialPreload(videoshotData.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载快照失败';
  } finally {
    loading.value = false;
    console.warn = originalWarn;
  }
};

const onDialogShow = () => {
  if (!videoshotData.value) {
    loadVideoshot();
  }
};

// ── Window resize tracking ─────────────────────────────────────────────
onMounted(() => {
  window.addEventListener('resize', onWindowResize);
  // Add wheel listener with passive option to avoid Chrome violation
  const card = viewerCardRef.value;
  if (card) {
    const el = (card as unknown as { $el?: HTMLElement }).$el ?? card;
    el.addEventListener('wheel', onWheel as EventListener, { passive: true });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  const card = viewerCardRef.value;
  if (card) {
    const el = (card as unknown as { $el?: HTMLElement }).$el ?? card;
    el.removeEventListener('wheel', onWheel as EventListener);
  }
});

// Reset data when bvid changes
watch(
  () => props.bvid,
  () => {
    videoshotData.value = null;
    currentIndex.value = 0;
  }
);
</script>

<style scoped>
.snapshot-viewer {
  border-radius: 12px;
  overflow: hidden;
  background-color: #111827;
  color: #e0e0e0;
  width: 90vw;
  max-width: 1100px;
  height: 85vh;
  max-height: 800px;
  overscroll-behavior: contain;
}

/* ── Header ─────────────────────────────── */
.snapshot-viewer-header {
  background: rgba(0, 0, 0, 0.35);
  min-height: 40px;
  flex: 0 0 auto;
}
.snapshot-viewer-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.snapshot-status-text {
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
}

/* ── Info Bar (below header) ───────────── */
.snapshot-info-bar {
  padding: 6px 20px 6px;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  flex: 0 0 auto;
  position: relative;
}
.info-bar-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
}
.info-uploader {
  color: #81d4fa;
  text-decoration: none;
  font-weight: 500;
}
.info-uploader:hover {
  text-decoration: underline;
  color: #b3e5fc;
}
.info-divider {
  color: rgba(255, 255, 255, 0.15);
}
.info-date {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}
.info-stats-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 3px;
}
.info-stat-item {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 12px;
}
.stat-label {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
}
.stat-value {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/* ── Description (collapsible, overlay) ── */
.snapshot-desc-wrapper {
  position: relative;
  height: 0;
  z-index: 10;
}
.snapshot-desc {
  position: relative;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  margin-top: 4px;
  max-height: 1.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: max-height 0.3s ease, white-space 0.3s ease, background 0.3s ease,
    box-shadow 0.3s ease;
  border-radius: 4px;
  padding: 2px 4px;
}
.snapshot-desc:hover {
  color: rgba(255, 255, 255, 0.55);
}
.snapshot-desc-expanded {
  max-height: 8em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  background: rgba(17, 24, 39, 0.95);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.55);
}

/* ── Body layout ────────────────────────── */
.snapshot-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.snapshot-body-bottom {
  flex-direction: column;
}
.snapshot-body-left {
  flex-direction: row;
}

/* ── Main area ──────────────────────────── */
.snapshot-main-area {
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.snapshot-main-area::-webkit-scrollbar {
  display: none;
}

/* ── Frame column (counter + image + time) ── */
.snapshot-frame-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* ── Frame counter (above preview with spacing) ── */
.snapshot-frame-counter {
  text-align: center;
  padding: 2px 0 6px;
  flex: 0 0 auto;
  font-family: monospace;
  font-size: 13px;
}
.frame-idx {
  color: #90caf9;
  font-weight: 600;
  font-size: 15px;
}
.frame-sep {
  color: rgba(255, 255, 255, 0.25);
  margin: 0 1px;
}
.frame-total {
  color: rgba(255, 255, 255, 0.4);
}

/* ── Frame region ───────────────────────── */
.snapshot-frame-region {
  flex: 1 1 0;
  min-height: 0;
  padding: 4px 8px;
}
.snapshot-frame-wrapper {
  gap: 4px;
}
.nav-btn {
  color: rgba(255, 255, 255, 0.35);
  transition: color 0.2s;
}
.nav-btn:hover:not([disabled]) {
  color: white;
}
.snapshot-main-frame {
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* ── Timestamp bar (below preview with spacing) ── */
.snapshot-time-bar {
  text-align: center;
  padding: 6px 0 0;
  flex: 0 0 auto;
  font-family: monospace;
  display: flex;
  align-items: center;
  justify-content: center;
}
.time-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  padding: 2px 10px;
  border-radius: 6px;
  transition: background 0.2s;
}
.time-link:hover {
  background: rgba(255, 255, 255, 0.06);
}
.time-link .time-current {
  color: #64b5f6;
  font-weight: 600;
  font-size: 14px;
}
.time-link .time-sep {
  color: rgba(255, 255, 255, 0.2);
  margin: 0 2px;
}
.time-link .time-total {
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
}
.time-jump-icon {
  color: rgba(255, 255, 255, 0.2);
  margin-left: 4px;
  transition: color 0.2s;
}
.time-link:hover .time-jump-icon {
  color: #90caf9;
}

/* ── Shortcuts hint ─────────────────────── */
.snapshot-shortcuts-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.12);
  text-align: center;
  padding: 1px 8px 4px;
  flex: 0 0 auto;
}

/* ── Timeline areas ─────────────────────── */
.snapshot-timeline-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  flex: 0 0 auto;
}
.snapshot-timeline-left {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  flex: 0 0 auto;
  width: 180px;
  overflow: hidden;
}

/* ── Responsive ───────────────────────────── */
@media (max-width: 768px) {
  .snapshot-viewer {
    width: 96vw;
    height: 92vh;
    max-width: none;
    max-height: none;
  }
  .snapshot-timeline-left {
    width: 140px;
  }
  .info-stats-row {
    display: none;
  }
  .snapshot-desc-wrapper {
    display: none;
  }
  .nav-btn {
    min-width: 32px;
  }
}
@media (max-width: 480px) {
  .snapshot-viewer-title {
    font-size: 12px;
  }
  .snapshot-info-bar {
    padding: 3px 12px 4px;
  }
  .info-bar-content {
    font-size: 12px;
  }
  .snapshot-frame-counter {
    padding: 2px 0 0;
  }
}
</style>
