<template>
  <AppSidebar />
  <div class="app-main-content" :style="mainContentStyle">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import AppSidebar from 'src/components/AppSidebar.vue';
import { useLayoutStore } from 'src/stores/layoutStore';

defineOptions({
  name: 'App',
});

const layoutStore = useLayoutStore();

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
});
</script>

<style>
.app-main-content {
  min-height: 100vh;
}
</style>
