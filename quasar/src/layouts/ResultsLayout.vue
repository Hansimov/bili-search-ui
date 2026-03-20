<template>
  <q-layout view="hHh lpr fFf">
    <q-header :style="headerStyle">
      <TitleToolbar />
    </q-header>
    <q-page-container>
      <q-page class="row items-start justify-evenly q-pa-none">
        <router-view />
        <div class="search-bar-sticky" :style="searchBarStickyStyle">
          <SearchBar />
        </div>
      </q-page>
    </q-page-container>
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

const searchBarStickyStyle = computed(() => {
  if (layoutStore.hasSidebar()) {
    return {
      left: `${layoutStore.sidebarWidth()}px`,
      width: `calc(100% - ${layoutStore.sidebarWidth()}px)`,
    };
  }
  return {
    left: '0',
    width: '100%',
  };
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
.search-bar-sticky {
  position: fixed;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  z-index: 1000;
  pointer-events: none;
  transition: left 0.25s ease, width 0.25s ease;
}

.search-bar-sticky::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  pointer-events: none;
}

body.body--light .search-bar-sticky::before {
  background: linear-gradient(to top, white 60%, transparent);
}

body.body--dark .search-bar-sticky::before {
  background: linear-gradient(to top, var(--q-dark-page) 60%, transparent);
}

.search-bar-sticky > * {
  pointer-events: auto;
  position: relative;
}
</style>
