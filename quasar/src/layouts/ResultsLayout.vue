<template>
  <q-layout view="hHh lpr fFf">
    <q-header :style="headerStyle">
      <TitleToolbar />
    </q-header>
    <q-page-container>
      <q-page class="row items-start justify-evenly q-pa-none">
        <router-view />
      </q-page>
    </q-page-container>
    <!-- Fixed search bar at the bottom (position:fixed bypasses html{zoom} issues) -->
    <div class="search-bar-bottom" :style="searchBarBottomStyle">
      <SearchBar />
    </div>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import TitleToolbar from 'components/TitleToolbar.vue';
import SearchBar from 'src/components/SearchBar.vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useExploreStore } from 'src/stores/exploreStore';

defineOptions({
  name: 'ResultsLayout',
});

const layoutStore = useLayoutStore();
const exploreStore = useExploreStore();

const headerStyle = computed(() => {
  if (layoutStore.hasSidebar()) {
    return {
      left: `${layoutStore.sidebarWidth()}px`,
      transition: 'left 0.25s ease',
    };
  }
  return {};
});

const searchBarBottomStyle = computed(() => {
  if (layoutStore.hasSidebar()) {
    return {
      left: `${layoutStore.sidebarWidth()}px`,
      transition: 'left 0.25s ease',
    };
  }
  return {};
});

/** Alt+← / Alt+→ 切换 explore 会话 */
const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (!event.altKey) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    exploreStore.toPrevSession();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    exploreStore.toNextSession();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.search-bar-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  pointer-events: none;
  z-index: 1000;
  /* 不设置 background，让滚动条透出 */
}

.search-bar-bottom > * {
  pointer-events: auto;
  position: relative;
}
</style>
