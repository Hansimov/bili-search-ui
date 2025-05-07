<template>
  <ResultAuthorFilters v-show="isHasAuthorFilter" />
  <div class="row results-list-info-top justify-between">
    <div class="results-stats" v-if="isShowResultsStats">
      <span v-show="isReturnResultsLessThanTotal">
        匹配：{{ totalHits }}，
      </span>
      <span>
        {{ isReturnResultsLessThanTotal ? '返回' : '匹配' }}：{{ returnHits }}
      </span>
      <span v-show="isHasAuthorFilter">，筛选：{{ sortedHits.length }} </span>
    </div>
    <div class="results-stats" v-else>
      <span> {{ currentStepName }} {{ currentStepMark }}</span>
    </div>
    <div class="results-paginate-top" v-if="!isCollapsePaginate">
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
  <div
    ref="resultsList"
    :class="dynamicResultsListClass"
    :style="dynamicResultsListStyle"
  >
    <ResultItem
      v-for="(result, index) in paginatedResults"
      :key="index"
      :result="result"
    />
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSearchStore } from 'src/stores/searchStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { resultsSortMethods, isNonEmptyArray } from 'src/stores/resultStore';
import ResultItem from './ResultItem.vue';
import ResultsPagination from './ResultsPagination.vue';
import ResultAuthorFilters from './ResultAuthorFilters.vue';

export default {
  components: {
    ResultItem,
    ResultsPagination,
    ResultAuthorFilters,
  },
  setup() {
    const searchStore = useSearchStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();

    // step result vars
    const currentResultDict = computed(
      () => exploreStore.currentStepResult?.output || {}
    );
    const currentStepName = computed(
      () => exploreStore.currentStepResult?.name_zh || ''
    );
    const currentStepStatus = computed(
      () => exploreStore.currentStepResult?.status || ''
    );
    const currentStepTimedOut = computed(
      () => exploreStore.currentStepResult?.output?.timed_out || false
    );
    const currentStepMark = computed(() => {
      const status = currentStepStatus.value;
      if (status === 'running') {
        return '⏳ (运行中)';
      } else if (status === 'finished') {
        if (currentStepTimedOut.value) {
          return '🕑 (超时)';
        } else {
          return '✔️ (成功)';
        }
      } else if (status === 'failed') {
        return '❌ (错误)';
      } else {
        return '';
      }
    });

    // all hits
    const allHits = computed(
      () => exploreStore.latestHitsResult.output?.hits || []
    );

    // hits stats
    const isShowResultsStats = computed(
      () =>
        currentStepStatus.value === 'finished' && isNonEmptyArray(allHits.value)
    );
    const returnHits = computed(
      () => exploreStore.latestHitsResult.output?.return_hits || 0
    );
    const totalHits = computed(
      () => exploreStore.latestHitsResult.output?.total_hits || 0
    );
    const isReturnResultsLessThanTotal = computed(
      () => returnHits.value < totalHits.value
    );

    // filter hits
    const authorFilters = computed(() => exploreStore.authorFilters);
    const isHasAuthorFilter = computed(() =>
      isNonEmptyArray(authorFilters.value)
    );
    const filteredHits = computed(() => {
      if (isHasAuthorFilter.value) {
        return allHits.value.filter((hit) =>
          authorFilters.value.some(
            (authorFilter) => hit.owner.mid === authorFilter.mid
          )
        );
      } else {
        return allHits.value;
      }
    });

    // sort hits
    const currentPage = computed({
      get: () => layoutStore.currentPage,
      set: (page) => {
        layoutStore.setCurrentPage(page);
      },
    });
    const itemsPerPage = computed(() => layoutStore.itemsPerPage);
    const resultsSortMethod = ref(searchStore.resultsSortMethod);
    function sortResults(method) {
      searchStore.setResultsSortMethod(method);
      resultsSortMethod.value = method;
      currentPage.value = 1;
    }
    const sortedHits = computed(() => {
      const method = resultsSortMethod.value;
      return [...filteredHits.value].sort((a, b) => {
        const valueA = method.field.split('.').reduce((o, i) => o[i], a);
        const valueB = method.field.split('.').reduce((o, i) => o[i], b);
        if (method.order === 'asc') {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });
    });

    // pagination
    const totalPages = computed(() =>
      Math.ceil(sortedHits.value.length / itemsPerPage.value)
    );
    const paginatedResults = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return sortedHits.value.slice(start, end);
    });
    const isCollapsePaginate = computed(() => layoutStore.isCollapsePaginate());

    // layout
    const dynamicResultsListClass = computed(() =>
      layoutStore.isSmallScreen()
        ? 'results-list q-gutter-none'
        : 'results-list q-gutter-xs'
    );
    const dynamicResultsListStyle = computed(() => ({
      maxWidth: `${Math.min(layoutStore.availableContentWidth(), 1280)}px`,
    }));
    const resultsList = ref(null);
    watch(
      [() => layoutStore.currentPage, () => resultsSortMethod.value.field],
      async () => {
        if (resultsList.value) {
          resultsList.value.scrollTop = 0;
        }
      }
    );

    onMounted(() => {
      layoutStore.addWindowResizeListener();
    });
    onUnmounted(() => {
      layoutStore.removeWindowResizeListener();
    });

    return {
      isShowResultsStats,
      currentResultDict,
      currentStepName,
      currentStepMark,
      returnHits,
      totalHits,
      resultsSortMethods,
      resultsSortMethod,
      sortResults,
      sortedHits,
      currentPage,
      totalPages,
      paginatedResults,
      isCollapsePaginate,
      dynamicResultsListClass,
      dynamicResultsListStyle,
      isReturnResultsLessThanTotal,
      isHasAuthorFilter,
      resultsList,
    };
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
  grid-template-columns: repeat(auto-fill, var(--result-item-width));
  /* Note: max-width is now dynamically applied via inline styles */
  max-height: calc(100vh - 230px);
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
