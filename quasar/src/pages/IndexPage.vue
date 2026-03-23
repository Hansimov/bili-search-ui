<template>
  <q-card flat class="index-page-card">
    <div class="index-content">
      <SearchModeEmptyState
        :mode="currentMode"
        variant="page"
        :show-direct-quick-help="isDirectMode"
      />
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SearchModeEmptyState from 'src/components/SearchModeEmptyState.vue';
import { useSearchModeStore } from 'src/stores/searchModeStore';

defineOptions({
  name: 'IndexPage',
});

const searchModeStore = useSearchModeStore();

const isDirectMode = computed(() => searchModeStore.isDirectMode);
const currentMode = computed(() => searchModeStore.currentMode);
</script>

<style lang="scss" scoped>
.index-page-card {
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: calc(100vh - 50px);
  padding-bottom: calc(var(--search-bar-total-height, 96px) + 32px);
}

.index-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  width: 100%;
  max-width: var(--search-input-max-width, 95vw);
  padding: 0 16px;
}
</style>
