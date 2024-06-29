<template>
  <div class="results-list">
    <ResultItem
      v-for="(result, index) in results"
      :key="index"
      :result="result"
    />
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}
</style>
