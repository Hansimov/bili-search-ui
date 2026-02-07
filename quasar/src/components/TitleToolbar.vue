<template>
  <q-toolbar class="title-toolbar">
    <!-- 移动端：汉堡菜单按钮 -->
    <q-btn
      v-if="isMobile"
      flat
      round
      dense
      icon="menu"
      size="sm"
      @click="toggleMobileMenu"
    />

    <q-space />

    <!-- 居中显示当前搜索查询 -->
    <span
      v-if="submittedQuery"
      class="toolbar-query-label"
      :title="submittedQuery"
    >
      {{ submittedQuery }}
    </span>

    <q-space />
  </q-toolbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useExploreStore } from 'src/stores/exploreStore';

const layoutStore = useLayoutStore();
const exploreStore = useExploreStore();

const isMobile = computed(() => layoutStore.isMobileMode());
const submittedQuery = computed(() => exploreStore.submittedQuery);

const toggleMobileMenu = () => {
  layoutStore.toggleMobileSidebar();
};
</script>

<style lang="scss" scoped>
.title-toolbar {
  min-height: 36px;
  padding: 0 12px;
}

.toolbar-query-label {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.85;
  max-width: 60vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
</style>

<style lang="scss">
.title-toolbar .q-focus-helper {
  visibility: hidden;
}
.title-toolbar a {
  text-decoration: none;
  color: inherit;
}
</style>
