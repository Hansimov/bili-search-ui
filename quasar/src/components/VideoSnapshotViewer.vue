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
    <q-card class="snapshot-viewer column no-wrap" @wheel.prevent="onWheel">
      <!-- ─── Header ─────────────────────────────────────── -->
      <q-toolbar class="snapshot-viewer-header">
        <q-toolbar-title class="ellipsis snapshot-viewer-title">
          {{ title }}
        </q-toolbar-title>

        <!-- Layout toggle -->
        <q-btn
          flat
          round
          dense
          :icon="layout === 'bottom' ? 'view_sidebar' : 'view_stream'"
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
          <div v-if="layout === 'left'" class="snapshot-timeline-left">
            <SnapshotTimeline
              :data="videoshotData"
              :currentIndex="currentIndex"
              :thumbScale="timelineScale"
              :direction="'vertical'"
              :loadedSheetIndices="videoshotData.loadedSheetIndices"
              @select="goToFrame"
            />
          </div>

          <!-- Main area: frame + controls -->
          <div class="snapshot-main-area col flex column">
            <!-- Frame counter (above preview) -->
            <div class="snapshot-frame-counter" v-if="videoshotData">
              <span class="frame-idx">{{ currentIndex + 1 }}</span>
              <span class="frame-sep">/</span>
              <span class="frame-total">{{ videoshotData.totalFrames }}</span>
              <span class="frame-sheet-info">
                · {{ videoshotData.loadedSheetIndices.size }}/{{
                  videoshotData.totalSheets
                }}
                快照
                <q-btn
                  v-if="
                    videoshotData.loadedSheetIndices.size <
                    videoshotData.totalSheets
                  "
                  flat
                  dense
                  no-caps
                  size="xs"
                  label="加载更多"
                  color="light-blue-4"
                  class="q-ml-xs"
                  :loading="loadingSheetsMore"
                  @click="loadNextBatchSheets"
                />
              </span>
            </div>

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
                <SnapshotFrameDisplay
                  v-if="currentFrame"
                  :frame="currentFrame"
                  :scale="mainScale"
                  class="snapshot-main-frame"
                />
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

            <!-- Timestamp bar (below preview) -->
            <div class="snapshot-time-bar">
              <span class="time-current">{{ currentTimestampStr }}</span>
              <span class="time-sep">/</span>
              <span class="time-total">{{ totalDurationStr }}</span>
              <a
                :href="currentBilibiliUrl"
                target="_blank"
                class="time-jump-link"
                title="在B站打开此时间点"
              >
                <q-icon name="open_in_new" size="13px" />
                跳转B站
              </a>
            </div>

            <!-- Video info section -->
            <div class="snapshot-video-info" v-if="result">
              <div class="video-info-main">
                <a
                  v-if="result.owner"
                  :href="`https://space.bilibili.com/${result.owner.mid}/video`"
                  target="_blank"
                  class="video-info-uploader"
                >
                  {{ result.owner.name }}
                </a>
                <span v-if="result.pubdate" class="video-info-date">
                  {{ tsToYmd(result.pubdate) }}
                </span>
                <span v-if="result.stat" class="video-info-stats">
                  <span class="video-stat-item">
                    <q-icon name="fa-regular fa-play-circle" size="12px" />
                    {{ humanReadableNumber(result.stat.view) }}
                  </span>
                  <span class="video-stat-item">
                    <q-icon name="fa-solid fa-align-left" size="12px" />
                    {{ humanReadableNumber(result.stat.danmaku) }}
                  </span>
                  <span class="video-stat-item">
                    <q-icon name="fa-solid fa-thumbs-up" size="12px" />
                    {{ humanReadableNumber(result.stat.like) }}
                  </span>
                  <span class="video-stat-item">
                    <q-icon name="fa-solid fa-star" size="12px" />
                    {{ humanReadableNumber(result.stat.favorite) }}
                  </span>
                </span>
              </div>
              <div
                v-if="result.desc && result.desc !== '-'"
                class="video-info-desc"
              >
                {{ result.desc }}
              </div>
            </div>

            <!-- Keyboard shortcuts hint -->
            <div class="snapshot-shortcuts-hint">
              ← → 滚轮切换帧 · PgUp/PgDn 跳10帧 · Home/End 首尾帧
            </div>
          </div>

          <!-- Timeline (bottom layout) -->
          <div v-if="layout === 'bottom'" class="snapshot-timeline-bottom">
            <SnapshotTimeline
              :data="videoshotData"
              :currentIndex="currentIndex"
              :thumbScale="timelineScale"
              :direction="'horizontal'"
              :loadedSheetIndices="videoshotData.loadedSheetIndices"
              @select="goToFrame"
            />
          </div>
        </div>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SnapshotFrameDisplay from './SnapshotFrameDisplay.vue';
import SnapshotTimeline from './SnapshotTimeline.vue';
import {
  fetchVideoshot,
  getFrameInfo,
  formatTimestamp,
  buildBilibiliUrl,
  INITIAL_SHEETS_LIMIT,
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
const loadingSheetsMore = ref(false);
const error = ref('');
const retryCount = ref(0);
const videoshotData = ref<VideoshotData | null>(null);
const currentIndex = ref(0);
const layout = ref<'bottom' | 'left'>('bottom');

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
  const sideOffset = layout.value === 'left' ? LEFT_PANEL_WIDTH + 20 : 0;
  const maxWidth = Math.min(960 - sideOffset, 800);
  const maxHeight = 360;
  const scaleX = maxWidth / videoshotData.value.imgXSize;
  const scaleY = maxHeight / videoshotData.value.imgYSize;
  return Math.min(scaleX, scaleY);
});

const timelineScale = computed(() => {
  if (!videoshotData.value) return 0.65;
  if (layout.value === 'left') {
    // Fit thumbnails inside the left panel (panel - padding - border)
    const availableWidth = LEFT_PANEL_WIDTH - 20;
    return availableWidth / videoshotData.value.imgXSize;
  }
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
 * 预加载指定拼版图序号列表的图片
 */
const preloadSheets = (
  data: VideoshotData,
  indices: number[]
): Promise<void[]> => {
  const promises = indices
    .filter((i) => i < data.totalSheets && !data.loadedSheetIndices.has(i))
    .map((i) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.onload = () => {
          data.loadedSheetIndices.add(i);
          resolve();
        };
        img.onerror = () => {
          data.loadedSheetIndices.add(i);
          resolve();
        };
        img.src = data.images[i];
      });
    });
  return Promise.all(promises);
};

/**
 * 首次加载：并行预加载前 N 张拼版图
 */
const initialPreload = async (data: VideoshotData) => {
  const indices = Array.from(
    { length: Math.min(INITIAL_SHEETS_LIMIT, data.totalSheets) },
    (_, i) => i
  );
  await preloadSheets(data, indices);
};

/**
 * "加载更多" 按钮：加载下一批拼版图
 */
const loadNextBatchSheets = async () => {
  if (!videoshotData.value) return;
  loadingSheetsMore.value = true;
  const loaded = videoshotData.value.loadedSheetIndices;
  const nextIndices: number[] = [];
  for (
    let i = 0;
    i < videoshotData.value.totalSheets &&
    nextIndices.length < INITIAL_SHEETS_LIMIT;
    i++
  ) {
    if (!loaded.has(i)) nextIndices.push(i);
  }
  await preloadSheets(videoshotData.value, nextIndices);
  loadingSheetsMore.value = false;
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
}
.snapshot-status-text {
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
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

/* ── Frame counter (above preview) ──────── */
.snapshot-frame-counter {
  text-align: center;
  padding: 6px 16px 2px;
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
.frame-sheet-info {
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  margin-left: 6px;
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

/* ── Timestamp bar (below preview) ──────── */
.snapshot-time-bar {
  text-align: center;
  padding: 2px 16px 4px;
  flex: 0 0 auto;
  font-family: monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.time-current {
  color: #64b5f6;
  font-weight: 600;
  font-size: 14px;
}
.time-sep {
  color: rgba(255, 255, 255, 0.2);
  margin: 0 2px;
}
.time-total {
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
}
.time-jump-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: rgba(255, 255, 255, 0.3);
  text-decoration: none;
  font-size: 11px;
  margin-left: 12px;
  transition: color 0.2s;
}
.time-jump-link:hover {
  color: #90caf9;
}

/* ── Video info section ─────────────────── */
.snapshot-video-info {
  padding: 4px 24px 2px;
  flex: 0 0 auto;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.video-info-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.video-info-uploader {
  color: #81d4fa;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}
.video-info-uploader:hover {
  text-decoration: underline;
}
.video-info-date {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}
.video-info-stats {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.video-stat-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}
.video-stat-item .q-icon {
  opacity: 0.6;
}
.video-info-desc {
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  margin-top: 3px;
  max-height: 2.8em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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
</style>
