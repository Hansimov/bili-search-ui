<template>
  <div class="row results-list-info-top justify-between">
    <div class="results-stats">
      <span>精度：{{ searchResultDict.detail_level }}</span>
      <span v-show="isReturnResultsLessThanTotal()"
        >，匹配：{{ searchResultDict.total_hits }}</span
      >
      <span
        >，{{ isReturnResultsLessThanTotal() ? '返回' : '匹配' }}：{{
          searchResultDict.return_hits
        }}</span
      >
    </div>
    <div class="results-paginate-top" v-if="$q.screen.gt.sm">
      <ResultsPagination
        :currentPage="currentPage"
        :totalPages="totalPages"
        @update:currentPage="currentPage = $event"
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
  <div class="flex flex-center q-pt-xs results-paginate-bottom">
    <ResultsPagination
      :currentPage="currentPage"
      :totalPages="totalPages"
      @update:currentPage="currentPage = $event"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import ResultItem from './ResultItem.vue';
import ResultsPagination from './ResultsPagination.vue';

export default {
  components: {
    ResultItem,
    ResultsPagination,
  },
  setup() {
    const searchStore = useSearchStore();
    const searchResultDict = computed(() => searchStore.searchResultDict);
    const resultsSortMethod = ref(searchStore.resultsSortMethod);
    const resultsSortMethods = ref([
      {
        field: 'score',
        order: 'desc',
        label: '综合排序',
        icon: 'fa-solid fa-check',
      },
      {
        field: 'pubdate',
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
      Math.ceil(searchResultDict.value.hits.length / itemsPerPage.value)
    );
    const paginatedResults = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return searchResultDict.value.hits.slice(start, end);
    });

    function sortResults(method) {
      searchStore.setResultsSortMethod(method);
      resultsSortMethod.value = method;
      searchResultDict.value.hits.sort((a, b) => {
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

    watch(searchResultDict, () => {
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
      searchResultDict,
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
      return (
        this.searchResultDict.return_hits < this.searchResultDict.total_hits
      );
    },
  },
};
</script>

<style lang="scss" scoped>
.results-stats,
.results-paginate-top {
  padding: 7px 5px 14px 6px;
  z-index: 1000;
}
.results-paginate-top {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.results-paginate-bottom {
  padding-top: 8px;
}
.q-btn {
  padding: 6px 5px 6px 6px;
  min-height: 28px;
  height: 28px;
  font-size: 14px;
  margin: 0px;
}
.results-list {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  max-width: min(1280px, 95vw);
  max-height: calc(100vh - 200px);
  overflow-y: scroll;
  overflow-x: hidden;
  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
}
@media (max-width: 520px) {
  .results-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: auto;
  }
}
</style>
