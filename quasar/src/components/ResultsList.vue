<template>
  <div class="row results-list-info-top justify-between">
    <span class="results-stats">
      <ExploreSessionSwitch v-show="isExploreSessionVisible" />
      <span class="results-stats-text">
        <span v-if="isShowResultsStats">
          <span v-show="isReturnResultsLessThanTotal">
            匹配：{{ totalHits }}，
          </span>
          <span>
            {{ isReturnResultsLessThanTotal ? '返回' : '匹配' }}：{{
              returnHits
            }}
          </span>
          <span v-show="isHasAuthorFilter"
            >，筛选：{{ sortedHits.length }}
          </span>
        </span>
        <span v-else> {{ currentStepName }} {{ currentStepMark }}</span>
      </span>
    </span>
    <div class="results-paginate-top" v-if="!isCollapsePaginate">
      <ResultsPagination
        :currentPage="currentPage"
        :totalPages="totalPages"
        @update:currentPage="handlePageChange"
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
  <ResultAuthorsList />
  <ResultAuthorFilters v-show="isHasAuthorFilter" />
  <div
    ref="resultsListDiv"
    :class="dynamicResultsListClass"
    :style="dynamicResultsListStyle"
    @scroll="handleScroll"
  >
    <ResultItem
      v-for="(result, index) in loadedResults"
      :key="result.bvid || index"
      :result="result"
    />
  </div>
  <div class="flex flex-center q-pt-xs results-paginate-bottom">
    <ResultsPagination
      :currentPage="currentPage"
      :totalPages="totalPages"
      @update:currentPage="handlePageChange"
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
import ResultAuthorsList from 'src/components/ResultAuthorsList.vue';
import ResultAuthorFilters from './ResultAuthorFilters.vue';
import ExploreSessionSwitch from './ExploreSessionSwitch.vue';

// Composable: Step result status
function useStepResultStatus(exploreStore) {
  const currentResultDict = computed(
    () => exploreStore.currentStepResult?.output || {}
  );
  const currentStepName = computed(
    () => exploreStore.currentStepResult?.name_zh || ''
  );
  const currentStepStatus = computed(
    () => exploreStore.currentStepResult?.status || ''
  );
  const currentStepMark = computed(() => {
    const status = currentStepStatus.value;
    if (status === 'running') return '⏳ (运行中)';
    if (status === 'finished') return '✔️ (成功)';
    if (status === 'timedout') return '🕑 (超时)';
    if (status === 'failed') return '❌ (错误)';
    return '';
  });

  return {
    currentResultDict,
    currentStepName,
    currentStepStatus,
    currentStepMark,
  };
}

// Composable: Hits filtering and statistics
function useHitsData(exploreStore) {
  const allHits = computed(
    () => exploreStore.latestHitsResult.output?.hits || []
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
    }
    return allHits.value;
  });

  return {
    allHits,
    returnHits,
    totalHits,
    isReturnResultsLessThanTotal,
    authorFilters,
    isHasAuthorFilter,
    filteredHits,
  };
}

// Composable: Sorting logic
function useSorting(searchStore, layoutStore, filteredHits) {
  const currentPage = computed({
    get: () => layoutStore.currentPage,
    set: (page) => layoutStore.setCurrentPage(page),
  });

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

  return {
    currentPage,
    resultsSortMethod,
    sortResults,
    sortedHits,
  };
}

// Composable: Pagination and loaded pages management
function usePagination(layoutStore, sortedHits) {
  const itemsPerPage = computed(() => layoutStore.itemsPerPage);
  const loadedPages = computed(() => layoutStore.loadedPages);

  const totalPages = computed(() =>
    Math.ceil(sortedHits.value.length / itemsPerPage.value)
  );

  const loadedResults = computed(() => {
    const sortedPageNumbers = Array.from(loadedPages.value).sort(
      (a, b) => a - b
    );
    const results = [];

    sortedPageNumbers.forEach((pageNum) => {
      const startIndex = (pageNum - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      results.push(...sortedHits.value.slice(startIndex, endIndex));
    });

    return results;
  });

  const getPageIndexInLoadedResults = (pageNum) => {
    const sortedPageNumbers = Array.from(loadedPages.value).sort(
      (a, b) => a - b
    );
    const pageIndex = sortedPageNumbers.indexOf(pageNum);
    if (pageIndex === -1) return -1;
    return pageIndex * itemsPerPage.value;
  };

  return {
    itemsPerPage,
    loadedPages,
    totalPages,
    loadedResults,
    getPageIndexInLoadedResults,
  };
}

// Composable: Scroll handling for infinite loading
function useInfiniteScroll(
  layoutStore,
  resultsListDiv,
  loadedPages,
  loadedResults,
  itemsPerPage,
  totalPages,
  currentPage,
  isUpdatingFromPage
) {
  const isUpdatingFromScroll = ref(false);

  const handleScroll = () => {
    if (!resultsListDiv.value) return;

    const element = resultsListDiv.value;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // Calculate which item is currently at the top of the viewport
    const loadedItems = loadedResults.value.length;
    if (loadedItems === 0) return;

    const itemHeight = scrollHeight / loadedItems;
    const topItemIndex = Math.floor(scrollTop / itemHeight);
    const bottomItemIndex = Math.floor((scrollTop + clientHeight) / itemHeight);

    // Use the middle of viewport to determine current page
    const middleItemIndex = Math.floor((topItemIndex + bottomItemIndex) / 2);
    const clampedIndex = Math.max(
      0,
      Math.min(middleItemIndex, loadedItems - 1)
    );

    // Convert item index to page number
    const sortedPageNumbers = Array.from(loadedPages.value).sort(
      (a, b) => a - b
    );
    const itemPage = Math.floor(clampedIndex / itemsPerPage.value);
    const clampedItemPage = Math.max(
      0,
      Math.min(itemPage, sortedPageNumbers.length - 1)
    );
    const currentViewPage = sortedPageNumbers[clampedItemPage];

    // Update current page based on scroll position
    if (
      currentViewPage !== currentPage.value &&
      loadedPages.value.has(currentViewPage)
    ) {
      if (!isUpdatingFromPage.value) {
        isUpdatingFromScroll.value = true;
        layoutStore.setCurrentPage(currentViewPage);
        setTimeout(() => {
          isUpdatingFromScroll.value = false;
        }, 100);
      }
    }

    const currentViewIndex = sortedPageNumbers.indexOf(currentViewPage);

    // Load more when scrolling near bottom of current page block
    const pageEndInDOM = (currentViewIndex + 1) * itemsPerPage.value;
    const pageEndScrollPos = pageEndInDOM * itemHeight;
    const distanceFromPageEnd = pageEndScrollPos - (scrollTop + clientHeight);

    if (distanceFromPageEnd < clientHeight * 0.5 && distanceFromPageEnd >= 0) {
      const nextPage = currentViewPage + 1;
      if (
        nextPage <= totalPages.value &&
        !isUpdatingFromPage.value &&
        !loadedPages.value.has(nextPage)
      ) {
        layoutStore.addLoadedPages([nextPage]);
      }
    }

    // Load more when scrolling near top of current page block
    const pageStartInDOM = currentViewIndex * itemsPerPage.value;
    const pageStartScrollPos = pageStartInDOM * itemHeight;
    const distanceFromPageStart = scrollTop - pageStartScrollPos;

    if (
      distanceFromPageStart < clientHeight * 0.5 &&
      distanceFromPageStart >= 0
    ) {
      const prevPage = currentViewPage - 1;
      if (
        prevPage >= 1 &&
        !isUpdatingFromPage.value &&
        !loadedPages.value.has(prevPage)
      ) {
        const oldScrollHeight = scrollHeight;
        layoutStore.addLoadedPages([prevPage]);

        setTimeout(() => {
          if (resultsListDiv.value) {
            const newScrollHeight = resultsListDiv.value.scrollHeight;
            const heightDiff = newScrollHeight - oldScrollHeight;
            resultsListDiv.value.scrollTop = scrollTop + heightDiff;
          }
        }, 50);
      }
    }
  };

  return {
    isUpdatingFromScroll,
    handleScroll,
  };
}

// Composable: Page change handling
function usePageChange(
  layoutStore,
  resultsListDiv,
  loadedPages,
  totalPages,
  isUpdatingFromScroll,
  getPageIndexInLoadedResults
) {
  const isUpdatingFromPage = ref(false);

  const handlePageChange = (newPage) => {
    if (isUpdatingFromScroll.value) return;

    isUpdatingFromPage.value = true;
    layoutStore.setCurrentPage(newPage);

    // Calculate pages to load (target - 1, target, target + 1)
    const pagesToLoad = [];
    for (
      let p = Math.max(1, newPage - 1);
      p <= Math.min(totalPages.value, newPage + 1);
      p++
    ) {
      if (!loadedPages.value.has(p)) {
        pagesToLoad.push(p);
      }
    }

    // Add new pages if needed
    if (pagesToLoad.length > 0) {
      layoutStore.addLoadedPages(pagesToLoad);
    }

    // Scroll to target page after DOM updates
    setTimeout(() => {
      const relativeIndex = getPageIndexInLoadedResults(newPage);
      if (relativeIndex >= 0) {
        const targetElement = resultsListDiv.value?.children[relativeIndex];
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }

      setTimeout(() => {
        isUpdatingFromPage.value = false;
      }, 500);
    }, 50);
  };

  return {
    isUpdatingFromPage,
    handlePageChange,
  };
}

export default {
  components: {
    ResultItem,
    ResultsPagination,
    ResultAuthorsList,
    ResultAuthorFilters,
    ExploreSessionSwitch,
  },
  setup() {
    const searchStore = useSearchStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();

    // Use composables
    const stepStatus = useStepResultStatus(exploreStore);
    const hitsData = useHitsData(exploreStore);
    const sorting = useSorting(searchStore, layoutStore, hitsData.filteredHits);
    const pagination = usePagination(layoutStore, sorting.sortedHits);

    // DOM refs
    const resultsListDiv = ref(null);
    const resultItemRefs = ref({});

    // Page change handling
    const pageChange = usePageChange(
      layoutStore,
      resultsListDiv,
      pagination.loadedPages,
      pagination.totalPages,
      ref(false), // will be replaced by scroll's isUpdatingFromScroll
      pagination.getPageIndexInLoadedResults
    );

    // Infinite scroll handling
    const scroll = useInfiniteScroll(
      layoutStore,
      resultsListDiv,
      pagination.loadedPages,
      pagination.loadedResults,
      pagination.itemsPerPage,
      pagination.totalPages,
      sorting.currentPage,
      pageChange.isUpdatingFromPage
    );

    // Update the isUpdatingFromScroll ref in pageChange
    pageChange.isUpdatingFromPage = pageChange.isUpdatingFromPage;

    // Computed properties
    const isShowResultsStats = computed(
      () =>
        stepStatus.currentStepStatus.value === 'finished' &&
        isNonEmptyArray(hitsData.allHits.value)
    );

    const isCollapsePaginate = computed(() => layoutStore.isCollapsePaginate());

    const dynamicResultsListClass = computed(() =>
      layoutStore.isSmallScreen()
        ? 'results-list q-gutter-none'
        : 'results-list q-gutter-xs'
    );

    const dynamicResultsListStyle = computed(() => {
      const authorsListHeight = layoutStore.authorsListHeight || 0;
      const adjustedHeight = 195 + authorsListHeight;
      return {
        maxWidth: `${Math.min(layoutStore.availableContentWidth(), 1280)}px`,
        maxHeight: `calc(100vh - ${adjustedHeight}px)`,
      };
    });

    const isExploreSessionVisible = computed(() =>
      exploreStore.isSessionSwitchVisible()
    );

    // Watch for results changes
    watch([() => sorting.sortedHits.value], () => {
      layoutStore.resetLoadedPages();
      if (resultsListDiv.value) {
        resultsListDiv.value.scrollTop = 0;
      }
    });

    // Lifecycle hooks
    onMounted(() => {
      layoutStore.addWindowResizeListener();
    });

    onUnmounted(() => {
      layoutStore.removeWindowResizeListener();
    });

    return {
      // Step status
      ...stepStatus,
      // Hits data
      returnHits: hitsData.returnHits,
      totalHits: hitsData.totalHits,
      isReturnResultsLessThanTotal: hitsData.isReturnResultsLessThanTotal,
      isHasAuthorFilter: hitsData.isHasAuthorFilter,
      // Sorting
      resultsSortMethods,
      resultsSortMethod: sorting.resultsSortMethod,
      sortResults: sorting.sortResults,
      sortedHits: sorting.sortedHits,
      currentPage: sorting.currentPage,
      // Pagination
      totalPages: pagination.totalPages,
      loadedResults: pagination.loadedResults,
      // UI
      isShowResultsStats,
      isCollapsePaginate,
      dynamicResultsListClass,
      dynamicResultsListStyle,
      isExploreSessionVisible,
      // DOM refs
      resultsListDiv,
      resultItemRefs,
      // Handlers
      handleScroll: scroll.handleScroll,
      handlePageChange: pageChange.handlePageChange,
    };
  },
};
</script>

<style lang="scss" scoped>
.results-stats,
.results-paginate-top {
  padding: 7px 5px 7px 6px;
  z-index: 1000;
  padding-left: 0px;
}
.results-stats-text {
  padding-left: 4px;
}
.results-sort {
  align-self: center;
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
  height: 36px;
  font-size: 14px;
  margin: 0px;
}
.results-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--result-item-width));
  /* Note: max-width and max-height are now dynamically applied via inline styles */
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
