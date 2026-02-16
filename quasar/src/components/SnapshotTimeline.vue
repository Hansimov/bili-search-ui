<!--
  SnapshotTimeline - 快照时间线组件

  水平滚动的帧缩略图条，支持：
  - 点击跳转到指定帧
  - 当前帧高亮显示
  - 当前帧自动滚动到可视区域
  - 鼠标悬停显示时间戳 tooltip
-->
<template>
  <div class="snapshot-timeline" ref="timelineRef">
    <div class="timeline-scroll" ref="scrollRef">
      <div
        v-for="(frame, idx) in frames"
        :key="idx"
        class="timeline-item"
        :class="{ 'timeline-item-active': idx === currentIndex }"
        :ref="
          (el) => {
            if (idx === currentIndex) activeItemEl = el as HTMLElement;
          }
        "
        @click="emit('select', idx)"
      >
        <SnapshotFrameDisplay :frame="frame" :scale="thumbScale" />
        <q-tooltip
          anchor="top middle"
          self="bottom middle"
          :delay="200"
          class="snapshot-timeline-tooltip"
        >
          {{ formatTimestamp(frame.timestamp) }}
        </q-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue';
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
  }>(),
  {
    thumbScale: 0.75,
  }
);

const emit = defineEmits<{
  select: [index: number];
}>();

const timelineRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const activeItemEl = ref<HTMLElement | null>(null);

/** 预计算所有帧的定位信息 */
const frames = computed<FrameInfo[]>(() => {
  const result: FrameInfo[] = [];
  for (let i = 0; i < props.data.totalFrames; i++) {
    result.push(getFrameInfo(props.data, i));
  }
  return result;
});

/** 将当前帧滚动到时间线可视区域的中央 */
const scrollToActive = async () => {
  await nextTick();
  if (activeItemEl.value) {
    activeItemEl.value.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }
};

watch(() => props.currentIndex, scrollToActive);
onMounted(scrollToActive);
</script>

<style scoped>
.snapshot-timeline {
  width: 100%;
  overflow: hidden;
  padding: 8px 0;
}
.timeline-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}
.timeline-scroll::-webkit-scrollbar {
  height: 6px;
}
.timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
.timeline-item {
  flex: 0 0 auto;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  transition: border-color 0.2s, transform 0.15s;
}
.timeline-item:hover {
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.08);
  z-index: 1;
}
.timeline-item-active {
  border-color: #42a5f5;
  box-shadow: 0 0 10px rgba(66, 165, 245, 0.5);
}
</style>

<style>
.snapshot-timeline-tooltip {
  font-size: 12px;
  padding: 2px 8px;
  font-family: monospace;
}
</style>
