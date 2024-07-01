<template>
  <div class="q-gutter-xs results-list">
    <div v-for="(result, index) in results" :key="index">
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
</style>
