<template>
  <div :class="containerClass">
    <template v-if="isNormal">
      <div class="results-normal-shell" :style="contentWidthStyle">
        <div
          v-if="showStatsBar"
          class="row results-list-info-top justify-between"
          v-show="hasResults || isExploreLoading"
        >
          <span class="results-stats">
            <ExploreSessionSwitch v-show="isExploreSessionVisible" />
            <span class="results-stats-text">
              <span v-if="isExploreLoading" class="loading-indicator">
                <q-spinner-dots size="16px" class="q-mr-xs" />
                <span>正在搜索：</span>
                <span class="loading-query">{{ submittedQuery }}</span>
                <span class="loading-dots"></span>
              </span>
              <span v-else-if="isShowResultsStats">
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

          <q-btn
            v-show="hasResults"
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

        <ResultAuthorsList v-show="showAuthorsSection" />
        <ResultAuthorFilters v-show="showAuthorFilters" />

        <div
          ref="resultsListDiv"
          class="results-list results-list--normal"
          @scroll="handleScroll"
        >
          <ResultItem
            v-for="(result, index) in displayedResults"
            :key="result.bvid || index"
            :result="result"
          />
        </div>

        <div
          v-show="showPagination"
          class="flex flex-center q-pt-xs results-paginate-bottom"
        >
          <ResultsPagination
            :currentPage="currentPage"
            :totalPages="totalPages"
            @update:currentPage="handlePageChange"
          />
        </div>
      </div>
    </template>

    <!-- === 内联模式：简化头部（排序按钮 + 查看全部） === -->
    <div v-else-if="isInline && hasResults" class="inline-results-header">
      <div class="inline-header-left">
        <span class="inline-results-count">{{ sortedHits.length }} 条结果</span>
        <q-btn
          flat
          dense
          size="sm"
          :icon-right="resultsSortMethod.icon"
          :label="resultsSortMethod.label"
          class="inline-sort-btn"
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
      <div class="inline-header-right">
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          icon="open_in_new"
          label="查看全部"
          class="inline-view-all-btn"
          @click="$emit('openDialog')"
        />
      </div>
    </div>

    <div
      v-if="!isNormal"
      ref="resultsListDiv"
      :class="gridClass"
      :style="gridStyle"
      @scroll="handleScroll"
    >
      <ResultItem
        v-for="(result, index) in displayedResults"
        :key="result.bvid || index"
        :result="result"
      />
    </div>

    <div
      v-if="!isNormal"
      v-show="showPagination"
      class="flex flex-center q-pt-xs results-paginate-bottom"
      :class="{ 'results-paginate-dialog': isDialog }"
    >
      <ResultsPagination
        :currentPage="currentPage"
        :totalPages="totalPages"
        @update:currentPage="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useSearchStore } from 'src/stores/searchStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { resultsSortMethods, isNonEmptyArray } from 'src/stores/resultStore';

import ResultItem from './ResultItem.vue';
import ResultsPagination from './ResultsPagination.vue';
import ResultAuthorsList from 'src/components/ResultAuthorsList.vue';
import ResultAuthorFilters from './ResultAuthorFilters.vue';
import ExploreSessionSwitch from './ExploreSessionSwitch.vue';

const RESULTS_MAX_WIDTH = 1280;

export default {
  props: {
    /** 最多显示的结果数量（0 表示不限制，仅 normal 模式有效） */
    maxItems: { type: Number, default: 0 },
    /**
     * 显示模式：
     * - 'normal': 正常模式（直接查找，全功能）
     * - 'inline': 内联模式（聊天面板中缩略显示，带排序和加载更多）
     * - 'dialog': 对话框模式（弹窗中显示，类似正常但适配对话框尺寸）
     */
    displayMode: { type: String, default: 'normal' },
  },
  emits: ['openDialog'],
  components: {
    ResultItem,
    ResultsPagination,
    ResultAuthorsList,
    ResultAuthorFilters,
    ExploreSessionSwitch,
  },
  setup(props) {
    // Forward to the main setup logic
    return _setup(props);
  },
};

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
          (authorFilter) => hit.owner?.mid === authorFilter.mid
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
      // 安全地访问嵌套属性（如 "stat.view"），避免中间路径为 undefined 时抛出异常
      const valueA = method.field
        .split('.')
        .reduce((o, i) => (o != null ? o[i] : undefined), a);
      const valueB = method.field
        .split('.')
        .reduce((o, i) => (o != null ? o[i] : undefined), b);
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;
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

function _setup(props) {
  const searchStore = useSearchStore();
  const exploreStore = useExploreStore();
  const layoutStore = useLayoutStore();

  // Display mode helpers
  const isInline = computed(() => props.displayMode === 'inline');
  const isDialog = computed(() => props.displayMode === 'dialog');
  const isNormal = computed(() => props.displayMode === 'normal');

  // Inline mode: fixed item limit
  const INLINE_DISPLAY_LIMIT = 6; // Items shown in inline mode

  // Submitted query for loading display (not the live input value)
  const submittedQuery = computed(() => exploreStore.submittedQuery || '');

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

  const dynamicResultsListStyle = computed(() => {
    const listWidth = `${Math.min(
      layoutStore.availableContentWidth(),
      RESULTS_MAX_WIDTH
    )}px`;

    return {
      width: listWidth,
      maxWidth: listWidth,
    };
  });

  const contentWidthStyle = computed(() => dynamicResultsListStyle.value);

  const isExploreSessionVisible = computed(() =>
    exploreStore.isSessionSwitchVisible()
  );

  const hasResults = computed(() => exploreStore.hasResults);
  const isExploreLoading = computed(() => exploreStore.isExploreLoading);

  // Watch for results changes
  watch([() => sorting.sortedHits.value], () => {
    layoutStore.resetLoadedPages();
    if (resultsListDiv.value) {
      resultsListDiv.value.scrollTop = 0;
    }
  });

  // Lifecycle hooks
  onMounted(() => {
    // resize listener is managed globally by App.vue
  });

  /** 是否处于折叠模式（maxItems > 0，仅 normal 模式） */
  const isCollapsed = computed(() => isNormal.value && props.maxItems > 0);

  /** 实际展示的结果 */
  const displayedResults = computed(() => {
    if (isInline.value) {
      // 内联模式：显示固定数量
      return sorting.sortedHits.value.slice(0, INLINE_DISPLAY_LIMIT);
    }
    if (isDialog.value) {
      return sorting.sortedHits.value;
    }
    const all = pagination.loadedResults.value;
    if (props.maxItems > 0) {
      return all.slice(0, props.maxItems);
    }
    return all;
  });

  // UI visibility helpers based on display mode
  const showStatsBar = computed(() => isNormal.value);
  const showAuthorsSection = computed(
    () => isNormal.value && !isCollapsed.value
  );
  const showAuthorFilters = computed(
    () =>
      hitsData.isHasAuthorFilter.value && isNormal.value && !isCollapsed.value
  );
  const showPagination = computed(() => isNormal.value && !isCollapsed.value);

  // Container class for dialog mode flex layout
  const containerClass = computed(() => {
    if (isDialog.value) {
      return 'results-container results-container--dialog';
    }
    if (isNormal.value) {
      return 'results-container results-container--normal';
    }
    return 'results-container';
  });

  // Grid class & style per mode
  const gridClass = computed(() => {
    if (isInline.value) {
      return layoutStore.isSmallScreen()
        ? 'results-list results-list--inline q-gutter-none'
        : 'results-list results-list--inline q-gutter-xs';
    }
    if (isDialog.value) {
      return 'results-list results-list--dialog';
    }
    return 'results-list results-list--normal';
  });

  const gridStyle = computed(() => {
    if (isInline.value) {
      // 内联模式：固定高度，自动显示滚动条
      return {
        maxHeight: '240px',
        overflowY: 'auto',
      };
    }
    if (isDialog.value) {
      // Dialog mode: flex container handles height, grid takes remaining space
      return {
        flex: '1 1 0',
        minHeight: '0',
        overflowY: 'scroll',
        scrollbarGutter: 'stable both-edges',
      };
    }
    // Normal mode: full dynamic calculation
    return dynamicResultsListStyle.value;
  });

  return {
    // Display mode
    isInline,
    isDialog,
    isNormal,
    // Container class
    containerClass,
    contentWidthStyle,
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
    displayedResults,
    isCollapsed,
    // UI visibility
    showStatsBar,
    showAuthorsSection,
    showAuthorFilters,
    showPagination,
    isShowResultsStats,
    gridClass,
    gridStyle,
    isExploreSessionVisible,
    hasResults,
    isExploreLoading,
    submittedQuery,
    // DOM refs
    resultsListDiv,
    resultItemRefs,
    // Handlers
    handleScroll: scroll.handleScroll,
    handlePageChange: pageChange.handlePageChange,
  };
}
</script>

<style lang="scss" scoped>
/* Container styles */
.results-container {
  display: flex;
  flex-direction: column;
}

.results-container--normal {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.results-container--dialog {
  height: 100%;
  min-height: 0;
}

.results-normal-shell {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  padding-inline: 10px;
  margin: 0 auto;
}

.results-stats {
  padding: 7px 5px 7px 0px;
  z-index: 1000;
}
.results-stats {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}
.results-list-info-top {
  min-height: 42px;
  width: 100%;
  flex-wrap: nowrap;
}
.results-stats-text {
  padding-left: 4px;
  display: flex;
  align-items: center;
  min-width: 0;
}
.loading-indicator {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  min-width: 0;
}
.loading-query {
  opacity: 0.75;
  font-style: bold;
  max-width: min(50vw, 420px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loading-dots::after {
  content: '';
  animation: dots 1.5s steps(4, end) infinite;
}
@keyframes dots {
  0% {
    content: '';
  }
  25% {
    content: '.';
  }
  50% {
    content: '..';
  }
  75% {
    content: '...';
  }
  100% {
    content: '';
  }
}
.results-sort {
  align-self: center;
  flex-shrink: 0;
}

.results-paginate-bottom {
  padding-top: 9px;
  padding-bottom: 6px;
  flex-shrink: 0;
}
.results-paginate-dialog {
  padding-bottom: 12px;
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
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(var(--result-item-width), 100%), 1fr)
  );
  /* max-width and max-height are applied via inline styles */
  overflow-y: scroll;
  overflow-x: hidden;
  width: 100%;
  min-height: 0;
  margin: 0 auto;
  align-content: start;
  justify-content: start;
  /* CSS containment: isolate grid layout from ancestor reflows */
  contain: layout style;
  gap: 10px;
  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
}

.results-list--normal {
  flex: 1 1 auto;
  min-height: 0;
  justify-content: start;
  align-content: start;
  padding-right: 6px;
  scrollbar-gutter: stable;
}

/* 内联模式：自适应宽度网格，居中对齐 */
.results-list--inline {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  max-width: 100%;
  overflow-x: hidden;
  justify-content: center;
  contain: none;
  gap: 10px;
}

/* 对话框模式：自适应宽度网格，居中对齐 */
.results-list--dialog {
  grid-template-columns: repeat(auto-fill, var(--result-item-width));
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
  scrollbar-gutter: stable both-edges;
  justify-content: center;
  align-content: start;
  contain: none;
  gap: 10px;
  padding: 4px 2px 8px;
}

.results-list--normal :deep(.result-item),
.results-list--normal :deep(.result-item-cover) {
  width: 100%;
  max-width: 100%;
}

/* 内联/对话框模式下，解除 result-item 的固定宽度限制 */
.results-list--inline :deep(.result-item),
.results-list--inline :deep(.result-item-cover),
.results-list--dialog :deep(.result-item-cover) {
  max-width: 100%;
}

.results-list--dialog :deep(.result-item) {
  width: var(--result-item-width);
  max-width: var(--result-item-width);
  justify-self: center;
}
@media (max-width: 569px) {
  .results-list--normal,
  .results-list--inline,
  .results-list--dialog {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: auto;
  }
}

/* === 内联模式样式 === */
.inline-results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 8px;
  font-size: 12px;
}

.inline-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.65;
}

.inline-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.inline-results-count {
  font-size: 12px;
  font-weight: 500;
}

.inline-sort-btn {
  font-size: 11px !important;
  height: 26px !important;
  min-height: 26px !important;
  padding: 2px 6px !important;
  opacity: 0.7;
  &:hover {
    opacity: 1;
  }
}

.inline-expand-btn,
.inline-view-all-btn {
  font-size: 12px !important;
  height: 28px !important;
  min-height: 28px !important;
  padding: 2px 10px !important;
  opacity: 0.6;
  &:hover {
    opacity: 1;
  }
}
</style>
