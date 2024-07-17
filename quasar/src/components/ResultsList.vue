<template>
  <div class="row">
    <div class="results-info">
      <span>精确等级：{{ results.detail_level }}</span
      ><span v-show="isReturnResultsLessThanTotal()"
        >，匹配视频：{{ results.total_hits }}</span
      ><span
        >，{{ isReturnResultsLessThanTotal() ? '展示' : '匹配' }}视频：{{
          results.return_hits
        }}</span
      >
    </div>
    <q-space></q-space>
    <q-btn-dropdown
      class="results-sort"
      flat
      unelevated
      :label="currentSortLabel"
    >
      <q-list dense>
        <q-item
          v-for="(method, index) in sortMethods"
          :key="index"
          clickable
          v-close-popup
          @click="sortResults(method.field, method.order, method.label)"
        >
          <q-item-section>
            <span>{{ method.label }}</span>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </div>
  <div class="q-gutter-xs results-list">
    <div v-for="(result, index) in results.hits" :key="index">
      <ResultItem :result="result" />
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import ResultItem from './ResultItem.vue';

export default {
  components: {
    ResultItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const results = computed(() => searchStore.results);

    const currentSortLabel = ref('相关度');
    const sortMethods = ref([
      { field: 'score', order: 'desc', label: '相关度' },
      { field: 'pubdate_str', order: 'desc', label: '发布时间（最新）' },
      { field: 'pubdate_str', order: 'asc', label: '发布时间（最早）' },
      { field: 'stat.view', order: 'desc', label: '播放量（最多）' },
      { field: 'stat.view', order: 'asc', label: '播放量（最少）' },
    ]);
    return {
      results,
      currentSortLabel,
      sortMethods,
    };
  },
  methods: {
    isReturnResultsLessThanTotal() {
      return this.results.return_hits < this.results.total_hits;
    },
    sortResults(field, order, method) {
      this.currentSortLabel = method;
      this.results.hits.sort((a, b) => {
        const valueA = field.split('.').reduce((o, i) => o[i], a);
        const valueB = field.split('.').reduce((o, i) => o[i], b);
        if (order === 'asc') {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });
    },
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
.results-sort {
  padding-right: 10px;
}
</style>
