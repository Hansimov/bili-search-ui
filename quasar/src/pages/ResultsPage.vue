<template>
  <q-card flat class="results-tabs-card">
    <div class="results-panels-card">
      <q-tab-panels
        keep-alive
        v-model="activeTab"
        transition-prev="fade"
        transition-next="fade"
        transition-duration="0"
      >
        <q-tab-panel name="videos">
          <ResultsList v-if="shouldShowResultsList" />
        </q-tab-panel>
        <q-tab-panel name="ai">
          <div class="q-gutter-xs ai-results-list"></div>
        </q-tab-panel>
        <q-tab-panel name="graph">
          <div class="q-gutter-xs graph-results-list"></div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-card>
</template>

<script>
import { computed } from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useExploreStore } from 'src/stores/exploreStore';
import ResultsList from 'src/components/ResultsList.vue';

export default {
  components: {
    ResultsList,
  },
  setup() {
    const layoutStore = useLayoutStore();
    const exploreStore = useExploreStore();
    const currentStepOutputType = computed(
      () => exploreStore.currentStepResult?.output_type || ''
    );
    const currentStepOutput = computed(
      () => exploreStore.currentStepResult?.output || {}
    );
    const shouldShowResultsList = computed(
      () =>
        currentStepOutputType.value === 'hits' && currentStepOutput.value.hits
    );
    return {
      activeTab: computed(() => layoutStore.activeTab || 'videos'),
      currentStepOutputType,
      currentStepOutput,
      shouldShowResultsList,
    };
  },
};
</script>

<style lang="scss" scoped>
body.body--light .search-bar-row {
  background: white;
}
body.body--dark .search-bar-row {
  background: var(--q-dark-page);
}
.results-tabs-card,
.results-panels-card {
  background: transparent;
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}
.ai-results-list,
.graph-results-list {
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  display: grid;
  max-width: min(1280px, 95vw);
}
body.body--dark .q-tab-panels {
  background: var(--q-dark-page);
}
.q-tab-panel {
  padding: 0px;
}
</style>
