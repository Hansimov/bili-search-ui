<template>
  <q-layout view="hHh lpr lFf">
    <q-header :style="headerStyle">
      <TitleToolbar />
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TitleToolbar from 'components/TitleToolbar.vue';
import { useLayoutStore } from 'src/stores/layoutStore';

defineOptions({
  name: 'IndexLayout',
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
</script>
