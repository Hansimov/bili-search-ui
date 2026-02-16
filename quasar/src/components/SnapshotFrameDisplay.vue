<!--
  SnapshotFrameDisplay - 快照帧显示组件

  从拼版图（sprite sheet）中显示单个帧。
  通过 CSS overflow:hidden + 绝对定位实现帧裁剪。
  支持缩放显示（通过 scale 属性）。

  实现原理：
  - 外层容器设为帧尺寸 × scale，overflow:hidden
  - 内层 img 设为拼版图尺寸 × scale，绝对定位偏移到正确帧位置
  - 这样 referrerpolicy="no-referrer" 可正常工作，无 CORS 问题
-->
<template>
  <div class="snapshot-frame-display" :style="containerStyle">
    <img
      :src="frame.sheetUrl"
      referrerpolicy="no-referrer"
      draggable="false"
      class="snapshot-sprite-sheet"
      :style="imgStyle"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="!loaded" class="snapshot-frame-placeholder">
      <q-spinner-dots size="20px" color="grey-5" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FrameInfo } from 'src/services/videoshotService';

const props = withDefaults(
  defineProps<{
    frame: FrameInfo;
    scale?: number;
  }>(),
  {
    scale: 1,
  }
);

const loaded = ref(false);

const containerStyle = computed(() => ({
  width: `${props.frame.width * props.scale}px`,
  height: `${props.frame.height * props.scale}px`,
  overflow: 'hidden',
  position: 'relative' as const,
  display: 'inline-block',
}));

const imgStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${-props.frame.offsetX * props.scale}px`,
  top: `${-props.frame.offsetY * props.scale}px`,
  width: `${props.frame.sheetWidth * props.scale}px`,
  height: 'auto',
  display: loaded.value ? 'block' : 'none',
}));

watch(
  () => props.frame.sheetUrl,
  () => {
    loaded.value = false;
  }
);

const onLoad = () => {
  loaded.value = true;
};
const onError = () => {
  loaded.value = true;
};
</script>

<style scoped>
.snapshot-frame-display {
  background: #111;
  border-radius: 4px;
}
.snapshot-sprite-sheet {
  pointer-events: none;
  user-select: none;
}
.snapshot-frame-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
