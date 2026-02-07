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
import { computed } from 'vue';
import TitleToolbar from 'components/TitleToolbar.vue';
import SearchBar from 'src/components/SearchBar.vue';
import { useLayoutStore } from 'src/stores/layoutStore';

defineOptions({
  name: 'ResultsLayout',
});

const layoutStore = useLayoutStore();

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
.search-bar-sticky > * {
  pointer-events: auto;
}
</style>
