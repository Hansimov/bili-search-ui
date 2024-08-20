<template>
  <div class="row results-list-row justify-between">
    <div class="results-info">
      <span>精确等级：{{ results.detail_level }}</span
      ><span v-show="!isSmallScreen && isReturnResultsLessThanTotal()"
        >，匹配视频：{{
          results.total_hits >= 10000 ? '≥10000' : results.total_hits
        }}</span
      ><span
        >，{{ isReturnResultsLessThanTotal() ? '返回' : '匹配' }}视频：{{
          results.return_hits
        }}</span
      >
    </div>
    <div class="results-paginate" v-if="$q.screen.gt.sm">
      <q-pagination
        flat
        unelevated
        gutter="2px"
        padding="1px 5px"
        direction-links
        color="none"
        active-color="primary"
        v-model="currentPage"
        :max="totalPages"
        v-if="totalPages > 1"
      />
    </div>
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
  <div :class="resultsListClass">
    <div v-for="(result, index) in paginatedResults" :key="index">
      <ResultItem :result="result" />
    </div>
  </div>
  <div class="flex flex-center q-pt-xs">
    <q-pagination
      flat
      unelevated
      gutter="2px"
      padding="1px 5px"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
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
        label: '综合排序',
        icon: 'fa-solid fa-check',
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
        field: 'stat.favorite',
        order: 'desc',
        label: '最多收藏',
        icon: 'fa-solid fa-star',
      },
      {
        field: 'title',
        order: 'asc',
        label: '标题文本',
        icon: 'fa-solid fa-sort-alpha-asc',
      },
    ]);

    const currentPage = ref(1);
    const itemsPerPage = ref(20);
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

    const isSmallScreen = ref(window.innerWidth <= 520);
    const resultsListClass = ref(
      isSmallScreen.value
        ? 'q-gutter-none results-list'
        : 'q-gutter-xs results-list'
    );
    const updateScreenSize = () => {
      isSmallScreen.value = window.innerWidth <= 520;
      resultsListClass.value = isSmallScreen.value
        ? 'q-gutter-none results-list'
        : 'q-gutter-xs results-list';
    };
    onMounted(() => {
      window.addEventListener('resize', updateScreenSize);
    });
    onUnmounted(() => {
      window.removeEventListener('resize', updateScreenSize);
    });

    return {
      results,
      resultsSortMethods,
      resultsSortMethod,
      sortResults,
      currentPage,
      totalPages,
      paginatedResults,
      isSmallScreen,
      resultsListClass,
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
@media (max-width: 520px) {
  .results-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: auto;
  }
}
.results-info,
.results-paginate {
  padding: 7px 5px 6px 6px;
}
.results-paginate {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.q-btn {
  padding: 6px 5px 6px 6px;
  min-height: 28px;
  height: 28px;
  font-size: 14px;
  margin: 0px;
}
</style>
