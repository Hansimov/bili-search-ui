<template>
  <span class="results-info"
    >精确等级：{{ results.detail_level }}，匹配视频：{{
      results.total_hits
    }}，展示视频：{{ results.return_hits }}</span
  >
  <div class="q-gutter-xs results-list">
    <div v-for="(result, index) in results.hits" :key="index">
      <ResultItem :result="result" />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import ResultItem from './ResultItem.vue';

export default {
  components: {
    ResultItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const results = computed(() => searchStore.results);
    return {
      results,
    };
  },
};
</script>

<style lang="scss" scoped>
.results-list {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  max-width: min(1280px, 95vw);
}
.results-info {
  padding-left: 10px;
}
</style>
