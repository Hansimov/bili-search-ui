<!--
  SnapshotTimeline - 快照时间线组件

  帧缩略图条，支持水平或垂直方向：
  - 点击跳转到指定帧
  - 当前帧高亮 + 自动滚动到可视区域
  - 每帧直接显示时间标签
  - 未加载的拼版图帧使用占位符
  - 虚拟滚动：仅渲染可视区域附近的帧，支持大量帧 (1000+)
-->
<template>
  <div class="snapshot-timeline" :class="directionClass" ref="timelineRef">
    <div
      class="timeline-scroll"
      ref="scrollRef"
      :style="scrollContainerStyle"
      @scroll="onScroll"
    >
      <!-- Spacer for virtual scrolling -->
      <div :style="totalSizeStyle"></div>

      <!-- Rendered items (only visible + buffer) -->
      <div
        v-for="entry in visibleEntries"
        :key="entry.index"
        class="timeline-item"
        :class="{
          'timeline-item-active': entry.index === currentIndex,
          'timeline-item-unloaded': !isSheetLoaded(entry.frame.sheetIndex),
        }"
        :style="entry.style"
        :ref="(el) => { if (entry.index === currentIndex) activeItemEl = el as HTMLElement; }"
        @click="emit('select', entry.index)"
      >
        <SnapshotFrameDisplay
          v-if="isSheetLoaded(entry.frame.sheetIndex)"
          :frame="entry.frame"
          :scale="thumbScale"
        />
        <div v-else class="timeline-placeholder" :style="placeholderStyle">
          <q-icon name="image" size="16px" color="grey-7" />
        </div>
        <!-- Time label overlay -->
        <span class="timeline-time-label">
          {{ formatTimestamp(entry.frame.timestamp) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import SnapshotFrameDisplay from './SnapshotFrameDisplay.vue';
import {
  getFrameInfo,
  formatTimestamp,
  type VideoshotData,
  type FrameInfo,
} from 'src/services/videoshotService';

const props = withDefaults(
  defineProps<{
    data: VideoshotData;
    currentIndex: number;
    thumbScale?: number;
    direction?: 'horizontal' | 'vertical';
    loadedSheetIndices?: Set<number>;
  }>(),
  {
    thumbScale: 0.75,
    direction: 'horizontal',
  }
);

const emit = defineEmits<{
  select: [index: number];
  'need-sheets': [indices: number[]];
}>();

const timelineRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const activeItemEl = ref<HTMLElement | null>(null);

const directionClass = computed(() =>
  props.direction === 'vertical' ? 'timeline-vertical' : 'timeline-horizontal'
);

const isVertical = computed(() => props.direction === 'vertical');

/** Minimum size of the scroll container to fit items */
const scrollContainerStyle = computed(() => {
  if (isVertical.value) return {};
  return { minHeight: `${itemHeight.value + 10}px` };
});

// ── Item sizing ────────────────────────────────────────────────────────────
/** Item dimensions including border + gap */
const itemWidth = computed(
  () => Math.ceil((props.data?.imgXSize ?? 160) * props.thumbScale) + 8
);
const itemHeight = computed(
  () => Math.ceil((props.data?.imgYSize ?? 90) * props.thumbScale) + 8
);

const placeholderStyle = computed(() => ({
  width: `${(props.data?.imgXSize ?? 160) * props.thumbScale}px`,
  height: `${(props.data?.imgYSize ?? 90) * props.thumbScale}px`,
}));

/** Check if a sprite sheet is loaded */
const isSheetLoaded = (sheetIndex: number): boolean => {
  if (!props.loadedSheetIndices) return true;
  return props.loadedSheetIndices.has(sheetIndex);
};

// ── Virtual scrolling ──────────────────────────────────────────────────────
const BUFFER_ITEMS = 5;
const scrollOffset = ref(0);

/** Total scrollable size of all items */
const totalSize = computed(() => {
  const count = props.data.totalFrames;
  if (isVertical.value) return count * itemHeight.value;
  return count * itemWidth.value;
});

const totalSizeStyle = computed(() => {
  if (isVertical.value) {
    return {
      width: '1px',
      height: `${totalSize.value}px`,
      position: 'absolute' as const,
      top: '0',
      left: '0',
      pointerEvents: 'none' as const,
      visibility: 'hidden' as const,
    };
  }
  return {
    width: `${totalSize.value}px`,
    height: '1px',
    position: 'absolute' as const,
    top: '0',
    left: '0',
    pointerEvents: 'none' as const,
    visibility: 'hidden' as const,
  };
});

/** Viewport size along scroll axis */
const viewportSize = computed(() => {
  if (!scrollRef.value) return 500;
  return isVertical.value
    ? scrollRef.value.clientHeight
    : scrollRef.value.clientWidth;
});

/** Visible entries with absolute positioning */
const visibleEntries = computed(() => {
  const itemSize = isVertical.value ? itemHeight.value : itemWidth.value;
  if (itemSize === 0) return [];

  const startIdx = Math.max(
    0,
    Math.floor(scrollOffset.value / itemSize) - BUFFER_ITEMS
  );
  const endIdx = Math.min(
    props.data.totalFrames - 1,
    Math.ceil((scrollOffset.value + viewportSize.value) / itemSize) +
      BUFFER_ITEMS
  );

  const entries: Array<{
    index: number;
    frame: FrameInfo;
    style: Record<string, string>;
  }> = [];

  for (let i = startIdx; i <= endIdx; i++) {
    const offset = i * itemSize;
    const frame = getFrameInfo(props.data, i);
    const w = `${itemWidth.value}px`;
    const h = `${itemHeight.value}px`;
    const style: Record<string, string> = isVertical.value
      ? {
          position: 'absolute',
          top: `${offset}px`,
          left: '0',
          right: '0',
          height: h,
        }
      : {
          position: 'absolute',
          left: `${offset}px`,
          top: '0',
          width: w,
          height: h,
        };
    entries.push({ index: i, frame, style });
  }

  return entries;
});

const onScroll = () => {
  if (!scrollRef.value) return;
  scrollOffset.value = isVertical.value
    ? scrollRef.value.scrollTop
    : scrollRef.value.scrollLeft;
};

// ── Lazy loading: emit needed sheet indices ────────────────────────────────
const neededSheetIndices = computed(() => {
  const sheets = new Set<number>();
  for (const entry of visibleEntries.value) {
    if (!isSheetLoaded(entry.frame.sheetIndex)) {
      sheets.add(entry.frame.sheetIndex);
    }
  }
  return [...sheets];
});

watch(
  neededSheetIndices,
  (indices) => {
    if (indices.length > 0) {
      emit('need-sheets', indices);
    }
  },
  { immediate: true }
);

/** Scroll the active frame into view */
const scrollToActive = async () => {
  await nextTick();
  if (!scrollRef.value) return;

  const itemSize = isVertical.value ? itemHeight.value : itemWidth.value;
  const targetOffset = props.currentIndex * itemSize;
  const vp = viewportSize.value;
  const currentScroll = isVertical.value
    ? scrollRef.value.scrollTop
    : scrollRef.value.scrollLeft;

  // Only scroll if active item is outside visible area
  if (
    targetOffset < currentScroll ||
    targetOffset + itemSize > currentScroll + vp
  ) {
    const newScroll = targetOffset - vp / 2 + itemSize / 2;
    scrollRef.value.scrollTo({
      [isVertical.value ? 'top' : 'left']: Math.max(0, newScroll),
      behavior: 'smooth',
    });
  }
};

watch(() => props.currentIndex, scrollToActive);

// ── Horizontal wheel scrolling ─────────────────────────────────────────────
/**
 * Convert vertical wheel events to horizontal scroll in horizontal mode.
 * This allows scrolling the horizontal timeline with mouse wheel.
 */
const onHorizontalWheel = (e: WheelEvent) => {
  if (isVertical.value || !scrollRef.value) return;
  // If there's significant vertical delta but little horizontal, convert it
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
    scrollRef.value.scrollLeft += e.deltaY;
    onScroll();
  }
};

onMounted(() => {
  scrollToActive();
  // Track viewport resizes
  if (scrollRef.value) {
    resizeObserver = new ResizeObserver(() => {
      onScroll();
    });
    resizeObserver.observe(scrollRef.value);
    // Attach wheel handler for horizontal scroll conversion
    scrollRef.value.addEventListener('wheel', onHorizontalWheel, {
      passive: false,
    });
  }
});

let resizeObserver: ResizeObserver | null = null;
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (scrollRef.value) {
    scrollRef.value.removeEventListener(
      'wheel',
      onHorizontalWheel as EventListener
    );
  }
});
</script>

<style scoped>
.snapshot-timeline {
  width: 100%;
  overflow: hidden;
  padding: 6px 0 10px;
}

/* ── Horizontal ─────────────────────────── */
.timeline-horizontal .timeline-scroll {
  display: block;
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}
.timeline-horizontal .timeline-scroll::-webkit-scrollbar {
  height: 5px;
}
.timeline-horizontal .timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* ── Vertical ───────────────────────────── */
.timeline-vertical {
  height: 100%;
  width: 100%;
  padding: 0;
}
.timeline-vertical .timeline-scroll {
  display: block;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px;
  height: 100%;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}
.timeline-vertical .timeline-scroll::-webkit-scrollbar {
  width: 4px;
}
.timeline-vertical .timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* ── Item ───────────────────────────────── */
.timeline-item {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  transition: border-color 0.15s, transform 0.12s;
  position: absolute;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}
.timeline-item:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.04);
  z-index: 1;
}
.timeline-item-active {
  border-color: #42a5f5;
  box-shadow: 0 0 8px rgba(66, 165, 245, 0.45);
}

/* Unloaded placeholder */
.timeline-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 2px;
}

/* ── Time label ─────────────────────────── */
.timeline-time-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.9);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
  padding: 10px 2px 4px;
  pointer-events: none;
  line-height: 1.2;
}
</style>
