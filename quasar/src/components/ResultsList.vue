<template>
  <div class="row results-list-row">
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
    <q-btn
      class="results-sort"
      flat
      :icon-right="resultsSortMethod.icon"
      :label="resultsSortMethod.label"
    >
      <q-menu>
        <q-list dense>
          <q-item
            v-for="(method, index) in resultsSortMethods"
            :key="index"
            clickable
            v-close-popup
            @click="sortResults(method)"
          >
            <q-item-section>
              <span>
                {{ method.label }}&nbsp;
                <q-icon :name="method.icon"></q-icon>
              </span>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
  <div class="flex flex-center q-pb-xs">
    <q-pagination
      direction-links
      color="none"
      active-color="primary"
      v-model="currentPage"
      :max="totalPages"
      v-if="totalPages > 1"
    />
  </div>
  <div class="q-gutter-xs results-list">
    <div v-for="(result, index) in paginatedResults" :key="index">
      <ResultItem :result="result" />
    </div>
  </div>
  <div class="flex flex-center q-pt-xs">
    <q-pagination
      direction-links
      color="none"
      active-color="primary"
      v-model="currentPage"
      :max="totalPages"
      v-if="totalPages > 1"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import ResultItem from './ResultItem.vue';

export default {
  components: {
    ResultItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const results = computed(() => searchStore.results);
    const resultsSortMethod = ref(searchStore.resultsSortMethod);
    const resultsSortMethods = ref([
      {
        field: 'score',
        order: 'desc',
        label: '最为匹配',
        icon: 'fa-solid fa-check',
      },
      {
        field: 'title',
        order: 'asc',
        label: '标题文本',
        icon: 'fa-solid fa-sort-alpha-asc',
      },
      {
        field: 'pubdate_str',
        order: 'desc',
        label: '最新发布',
        icon: 'fa-regular fa-clock',
      },
      {
        field: 'stat.view',
        order: 'desc',
        label: '最高播放',
        icon: 'fa-regular fa-play-circle',
      },
      {
        field: 'stat.danmaku',
        order: 'desc',
        label: '最多弹幕',
        icon: 'fa-solid fa-align-left',
      },
      {
        field: 'stat.coin',
        order: 'desc',
        label: '最多投币',
        icon: 'fa-solid fa-soccer-ball',
      },
      {
        field: 'stat.star',
        order: 'desc',
        label: '最多收藏',
        icon: 'fa-solid fa-star',
      },
    ]);

    const currentPage = ref(1);
    const itemsPerPage = ref(25);
    const totalPages = computed(() =>
      Math.ceil(results.value.hits.length / itemsPerPage.value)
    );
    const paginatedResults = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return results.value.hits.slice(start, end);
    });

    function sortResults(method) {
      searchStore.setResultsSortMethod(method);
      resultsSortMethod.value = method;
      results.value.hits.sort((a, b) => {
        const valueA = method.field.split('.').reduce((o, i) => o[i], a);
        const valueB = method.field.split('.').reduce((o, i) => o[i], b);
        if (method.order === 'asc') {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });
      currentPage.value = 1;
    }

    watch(results, () => {
      sortResults(resultsSortMethod.value);
      currentPage.value = 1;
    });

    return {
      results,
      resultsSortMethods,
      resultsSortMethod,
      sortResults,
      currentPage,
      totalPages,
      paginatedResults,
    };
  },
  methods: {
    isReturnResultsLessThanTotal() {
      return this.results.return_hits < this.results.total_hits;
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
  padding: 3px 0px 4px 10px;
}
.q-btn {
  min-height: 28px;
  height: 28px;
  font-size: 14px;
  padding: 0px 6px 0px 6px;
  margin: 0px;
}
</style>
