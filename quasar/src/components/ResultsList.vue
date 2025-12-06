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
    const currentStepMark = computed(() => {
      const status = currentStepStatus.value;
      if (status === 'running') {
        return '⏳ (运行中)';
      } else if (status === 'finished') {
        return '✔️ (成功)';
      } else if (status === 'timedout') {
        return '🕑 (超时)';
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
    const isCollapsePaginate = computed(() => layoutStore.isCollapsePaginate());

    // Loaded pages set
    const loadedPages = computed(() => layoutStore.loadedPages);

    // Results to display based on loaded pages (may be non-contiguous)
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

    // Get the index of first item of a page in the loaded results
    const getPageIndexInLoadedResults = (pageNum) => {
      const sortedPageNumbers = Array.from(loadedPages.value).sort(
        (a, b) => a - b
      );
      const pageIndex = sortedPageNumbers.indexOf(pageNum);
      if (pageIndex === -1) return -1;
      return pageIndex * itemsPerPage.value;
    };

    // layout
    const dynamicResultsListClass = computed(() =>
      layoutStore.isSmallScreen()
        ? 'results-list q-gutter-none'
        : 'results-list q-gutter-xs'
    );
    const dynamicResultsListStyle = computed(() => {
      const authorsListHeight = layoutStore.authorsListHeight || 0;
      // auto modify maxHeight at authors-list collapsed or expanded
      const adjustedHeight = 195 + authorsListHeight;
      return {
        maxWidth: `${Math.min(layoutStore.availableContentWidth(), 1280)}px`,
        maxHeight: `calc(100vh - ${adjustedHeight}px)`,
      };
    });
    const resultsListDiv = ref(null);
    const resultItemRefs = ref({});
    const isUpdatingFromScroll = ref(false);
    const isUpdatingFromPage = ref(false);

    // Handle scroll to update current page and load more
    const handleScroll = () => {
      if (!resultsListDiv.value) {
        return;
      }

      const element = resultsListDiv.value;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      // Calculate current page based on scroll position in loaded results
      const scrollPercentage =
        scrollHeight > clientHeight
          ? scrollTop / (scrollHeight - clientHeight)
          : 0;
      const loadedItems = loadedResults.value.length;
      const estimatedIndex = Math.floor(scrollPercentage * loadedItems);
      const itemPage = Math.floor(estimatedIndex / itemsPerPage.value);

      // Convert to actual page number
      const sortedPageNumbers = Array.from(loadedPages.value).sort(
        (a, b) => a - b
      );
      const currentViewPage =
        sortedPageNumbers[itemPage] || sortedPageNumbers[0];

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

      // Find position of current view page in the sorted array
      const currentViewIndex = sortedPageNumbers.indexOf(currentViewPage);

      // Load more when scrolling near bottom (80%)
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        // Check if next page (currentViewPage + 1) is already loaded
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
      // Check if we're in the first 30% of the current page's content in the DOM
      const pageStartInDOM = currentViewIndex * itemsPerPage.value;
      const itemHeight = scrollHeight / loadedItems;
      const pageStartScrollPos = pageStartInDOM * itemHeight;
      const distanceFromPageStart = scrollTop - pageStartScrollPos;

      if (
        distanceFromPageStart < clientHeight * 0.5 &&
        distanceFromPageStart >= 0
      ) {
        // We're near the top of the current view page, load the previous page if missing
        const prevPage = currentViewPage - 1;
        if (
          prevPage >= 1 &&
          !isUpdatingFromPage.value &&
          !loadedPages.value.has(prevPage)
        ) {
          // Store current scroll position info
          const oldScrollHeight = scrollHeight;
          layoutStore.addLoadedPages([prevPage]);

          // Adjust scroll position to maintain visual position
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

    // Handle page change: load target page and adjacent pages
    const handlePageChange = (newPage) => {
      if (isUpdatingFromScroll.value) {
        return;
      }

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

    // Reset to first page when results change
    watch([() => sortedHits.value], () => {
      layoutStore.resetLoadedPages();
      if (resultsListDiv.value) {
        resultsListDiv.value.scrollTop = 0;
      }
    });

    const isExploreSessionVisible = computed(() =>
      exploreStore.isSessionSwitchVisible()
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
      loadedResults,
      isCollapsePaginate,
      dynamicResultsListClass,
      dynamicResultsListStyle,
      isReturnResultsLessThanTotal,
      isHasAuthorFilter,
      resultsListDiv,
      resultItemRefs,
      isExploreSessionVisible,
      handleScroll,
      handlePageChange,
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
