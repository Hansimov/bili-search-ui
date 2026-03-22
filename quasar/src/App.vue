<template>
  <AsyncAppSidebar v-if="shouldRenderSidebar" />
  <div class="app-main-content" :style="mainContentStyle">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { scheduleAfterInitialRender } from 'src/utils/schedule';

defineOptions({
  name: 'App',
});

const layoutStore = useLayoutStore();
const shouldRenderSidebar = ref(false);
const AsyncAppSidebar = defineAsyncComponent(
  () => import('src/components/AppSidebar.vue')
);

const mainContentStyle = computed(() => {
  if (layoutStore.hasSidebar()) {
    return {
      marginLeft: `${layoutStore.sidebarWidth()}px`,
      transition: 'margin-left 0.25s ease',
    };
  }
  return {};
});

onMounted(() => {
  // 初始化搜索输入框最大宽度（考虑侧边栏宽度）
  layoutStore.updateSearchInputMaxWidth();
  layoutStore.addWindowResizeListener();
  scheduleAfterInitialRender(() => {
    shouldRenderSidebar.value = true;
  });
});
</script>

<style>
.app-main-content {
  min-height: 100vh;
}
</style>
