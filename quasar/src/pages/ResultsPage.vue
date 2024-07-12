<template>
  <q-page class="row items-start justify-evenly q-pa-none">
    <q-card flat class="results-tabs-card">
      <ResultsTypesBar />
      <div class="results-panels-card">
        <q-tab-panels
          keep-alive
          v-model="activeTab"
          transition-prev="fade"
          transition-next="fade"
          transition-duration="0"
        >
          <q-tab-panel name="titles">
            <span>标题搜索结果</span>
            <results-list class="titles-results-list"></results-list>
          </q-tab-panel>
          <q-tab-panel name="frames">
            <span>画面搜索结果</span>
            <div class="q-gutter-xs frames-results-list"></div>
          </q-tab-panel>
          <q-tab-panel name="subtitles">
            <span>字幕搜索结果</span>
            <div class="q-gutter-xs subtitles-results-list"></div>
          </q-tab-panel>
          <q-tab-panel name="ai">
            <span>AI 回答</span>
            <div class="q-gutter-xs ai-results-list"></div>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </q-card>
  </q-page>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from 'src/stores/searchStore';
import ResultsList from 'src/components/ResultsList.vue';
import ResultsTypesBar from 'src/components/ResultsTypesTab.vue';

export default {
  components: {
    ResultsList,
    ResultsTypesBar,
  },
  setup() {
    const searchStore = useSearchStore();
    return {
      activeTab: computed(() => searchStore.activeTab || 'titles'),
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
}
.frames-results-list,
.subtitles-results-list,
.ai-results-list {
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  display: grid;
  max-width: min(1280px, 95vw);
}
</style>
