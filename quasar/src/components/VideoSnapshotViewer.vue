<!--
  VideoSnapshotViewer - 视频快照查看器

  全功能快照浏览对话框，支持：
  - 加载和显示视频快照（调用 Bilibili 视频快照 API）
  - 放大显示当前帧（自适应缩放）
  - 时间线缩略图条（底部）
  - 键盘导航（方向键、Home/End、PageUp/PageDown）
  - 点击跳转到 Bilibili 对应时间点（支持分P参数）
  - 加载/错误状态处理

  布局：
  ┌───────────────────────────────────────┐
  │ 标题                            [×]  │
  ├───────────────────────────────────────┤
  │                                       │
  │     ◀    [ 当前帧（放大） ]     ▶    │
  │                                       │
  │        帧 23/186  01:23               │
  │        [跳转到B站 ↗]                  │
  ├───────────────────────────────────────┤
  │ [帧][帧][帧][帧][帧]... 时间线       │
  └───────────────────────────────────────┘
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
    <q-card class="snapshot-viewer column no-wrap" :style="cardStyle">
      <!-- Header -->
      <q-toolbar class="snapshot-viewer-header">
        <q-toolbar-title class="text-subtitle1 ellipsis snapshot-viewer-title">
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" color="grey-4" @click="close" />
      </q-toolbar>

      <!-- Loading -->
      <div v-if="loading" class="col flex flex-center column">
        <q-spinner-dots size="40px" color="blue-4" />
        <div class="q-mt-md snapshot-status-text">正在加载视频快照...</div>
      </div>

      <!-- Error -->
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

      <!-- Main Content -->
      <template v-else-if="videoshotData && videoshotData.totalFrames > 0">
        <!-- Frame display area -->
        <div class="col flex flex-center column snapshot-main-area">
          <!-- Frame with navigation buttons -->
          <div class="snapshot-frame-wrapper flex flex-center items-center">
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
                !videoshotData || currentIndex >= videoshotData.totalFrames - 1
              "
              @click="nextFrame"
            />
          </div>

          <!-- Controls -->
          <div class="snapshot-controls q-mt-sm">
            <span class="snapshot-frame-info">
              帧 {{ currentIndex + 1 }} / {{ videoshotData.totalFrames }}
            </span>
            <span class="snapshot-timestamp q-ml-md">
              {{ currentTimestampStr }}
            </span>
            <a
              :href="currentBilibiliUrl"
              target="_blank"
              class="snapshot-jump-link q-ml-md"
              title="在B站打开此时间点"
            >
              <q-icon name="open_in_new" size="14px" class="q-mr-xs" />
              跳转到B站
            </a>
          </div>

          <!-- Keyboard shortcuts hint -->
          <div class="snapshot-shortcuts-hint q-mt-xs">
            ← → 切换帧 &nbsp;·&nbsp; PgUp/PgDn 跳10帧 &nbsp;·&nbsp; Home/End
            首尾帧
          </div>
        </div>

        <!-- Timeline -->
        <div class="snapshot-timeline-area">
          <SnapshotTimeline
            :data="videoshotData"
            :currentIndex="currentIndex"
            :thumbScale="timelineScale"
            @select="goToFrame"
          />
        </div>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import SnapshotFrameDisplay from './SnapshotFrameDisplay.vue';
import SnapshotTimeline from './SnapshotTimeline.vue';
import {
  fetchVideoshot,
  getFrameInfo,
  formatTimestamp,
  buildBilibiliUrl,
  type VideoshotData,
  type FrameInfo,
} from 'src/services/videoshotService';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    bvid: string;
    title: string;
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

const $q = useQuasar();

// ── State ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const error = ref('');
const videoshotData = ref<VideoshotData | null>(null);
const currentIndex = ref(0);

// ── Computed: current frame ────────────────────────────────────────────────
const currentFrame = computed<FrameInfo | null>(() => {
  if (!videoshotData.value) return null;
  return getFrameInfo(videoshotData.value, currentIndex.value);
});

const currentTimestampStr = computed(() => {
  if (!currentFrame.value) return '00:00';
  return formatTimestamp(currentFrame.value.timestamp);
});

const currentBilibiliUrl = computed(() => {
  if (!currentFrame.value) return '#';
  return buildBilibiliUrl(props.bvid, currentFrame.value.timestamp, props.page);
});

// ── Computed: responsive scales ────────────────────────────────────────────

/** 主显示区帧缩放比，自适应视口大小 */
const mainScale = computed(() => {
  if (!videoshotData.value) return 4;
  const vw = $q.screen.width;
  const vh = $q.screen.height;
  // 留出导航按钮、控件和时间线的空间
  const maxWidth = Math.min(vw * 0.65, 960);
  const maxHeight = Math.min(vh * 0.45, 540);
  const scaleX = maxWidth / videoshotData.value.imgXSize;
  const scaleY = maxHeight / videoshotData.value.imgYSize;
  return Math.min(scaleX, scaleY);
});

/** 时间线缩略图缩放比 */
const timelineScale = computed(() => {
  const vw = $q.screen.width;
  if (vw < 600) return 0.5;
  if (vw < 1024) return 0.625;
  return 0.75;
});

/** 对话框卡片样式 */
const cardStyle = computed(() => ({
  width: 'min(95vw, 1200px)',
  height: 'min(90vh, 850px)',
  maxWidth: '95vw',
  maxHeight: '90vh',
  backgroundColor: '#1a1a2e',
  color: '#e0e0e0',
}));

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
      if (videoshotData.value) {
        currentIndex.value = videoshotData.value.totalFrames - 1;
      }
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

// ── Data loading ───────────────────────────────────────────────────────────
const loadVideoshot = async () => {
  loading.value = true;
  error.value = '';
  currentIndex.value = 0;

  try {
    videoshotData.value = await fetchVideoshot(props.bvid, props.cid);
    if (videoshotData.value.totalFrames === 0) {
      error.value = '该视频没有可用的快照数据';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载快照失败';
  } finally {
    loading.value = false;
  }
};

const onDialogShow = () => {
  if (!videoshotData.value) {
    loadVideoshot();
  }
};

// Reset data when bvid changes (for component reuse)
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
}
.snapshot-viewer-header {
  background: rgba(0, 0, 0, 0.3);
  min-height: 48px;
}
.snapshot-viewer-title {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}
.snapshot-status-text {
  color: rgba(255, 255, 255, 0.7);
}

/* Main frame area */
.snapshot-main-area {
  flex: 1;
  min-height: 0;
  padding: 12px 8px;
}
.snapshot-frame-wrapper {
  gap: 4px;
}
.nav-btn {
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s;
}
.nav-btn:hover:not([disabled]) {
  color: white;
}
.snapshot-main-frame {
  border-radius: 6px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

/* Controls */
.snapshot-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
}
.snapshot-frame-info {
  color: rgba(255, 255, 255, 0.6);
}
.snapshot-timestamp {
  color: #64b5f6;
  font-weight: 500;
  font-family: monospace;
  font-size: 15px;
}
.snapshot-jump-link {
  color: #90caf9;
  text-decoration: none;
  transition: color 0.2s;
  font-size: 13px;
}
.snapshot-jump-link:hover {
  color: #42a5f5;
  text-decoration: underline;
}
.snapshot-shortcuts-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

/* Timeline area */
.snapshot-timeline-area {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
  flex: 0 0 auto;
}
</style>
