<template>
  <div class="row results-list-info-top justify-between">
    <div class="results-stats" v-if="isShowResultsStats">
      <span v-show="isReturnResultsLessThanTotal()">
        匹配：{{ totalHits }}，
      </span>
      <span>
        {{ isReturnResultsLessThanTotal() ? '返回' : '匹配' }}：{{ returnHits }}
      </span>
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
  <div :class="dynamicResultsListClass" :style="dynamicResultsListStyle">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSearchStore } from 'src/stores/searchStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { resultsSortMethods, isNonEmptyArray } from 'src/stores/resultStore';
import ResultItem from './ResultItem.vue';
import ResultsPagination from './ResultsPagination.vue';

export default {
  components: {
    ResultItem,
    ResultsPagination,
  },
  setup() {
    const searchStore = useSearchStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();

    const currentResultDict = computed(
      () => exploreStore.currentStepResult?.output || {}
    );
    const currentStepName = computed(() => {
      return exploreStore.currentStepResult?.name_zh || '';
    });
    const currentStepStatus = computed(() => {
      return exploreStore.currentStepResult?.status || '';
    });
    const currentStepTimedOut = computed(() => {
      return exploreStore.currentStepResult?.output?.timed_out || false;
    });
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
    const hits = computed(() => {
      return exploreStore.latestHitsResult.output?.hits || [];
    });
    const isShowResultsStats = computed(() => {
      return (
        currentStepStatus.value === 'finished' && isNonEmptyArray(hits.value)
      );
    });

    const returnHits = computed(() => {
      return exploreStore.latestHitsResult.output?.return_hits || 0;
    });
    const totalHits = computed(() => {
      return exploreStore.latestHitsResult.output?.total_hits || 0;
    });
    function isReturnResultsLessThanTotal() {
      return returnHits.value < totalHits.value;
    }

    const currentPage = ref(1);
    const itemsPerPage = ref(20);
    const totalPages = computed(() =>
      Math.ceil(hits.value.length / itemsPerPage.value)
    );
    const paginatedResults = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return hits.value.slice(start, end);
    });

    const resultsSortMethod = ref(searchStore.resultsSortMethod);
    function sortResults(method) {
      searchStore.setResultsSortMethod(method);
      resultsSortMethod.value = method;
      hits.value.sort((a, b) => {
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

    watch(hits, () => {
      sortResults(resultsSortMethod.value);
      currentPage.value = 1;
    });

    const isCollapsePaginate = computed(() => {
      return layoutStore.isCollapsePaginate();
    });
    const dynamicResultsListClass = computed(() => {
      if (layoutStore.isSmallScreen()) {
        return 'results-list q-gutter-none';
      } else {
        return 'results-list q-gutter-xs';
      }
    });
    const dynamicResultsListStyle = computed(() => {
      return {
        maxWidth: `${Math.min(layoutStore.availableContentWidth(), 1280)}px`,
      };
    });

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
      currentPage,
      totalPages,
      paginatedResults,
      isCollapsePaginate,
      dynamicResultsListClass,
      dynamicResultsListStyle,
      isReturnResultsLessThanTotal,
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
