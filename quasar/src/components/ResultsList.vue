<template>
  <div class="row results-list-info-top justify-between">
    <div class="results-stats" v-if="isShowResultsList">
      <span v-show="isReturnResultsLessThanTotal()">
        匹配：{{ totalHits }}，
      </span>
      <span>
        {{ isReturnResultsLessThanTotal() ? '返回' : '匹配' }}：{{ returnHits }}
      </span>
    </div>
    <div class="results-stats" v-else>
      <span> {{ currentStepName }} {{ currentStepStatus }}</span>
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

    // const currentStepOutputType = computed(
    //   () => exploreStore.currentStepResult?.output_type || ''
    // );
    const currentResultDict = computed(
      () => exploreStore.currentStepResult?.output || {}
    );
    const currentStepName = computed(() => {
      return exploreStore.currentStepResult?.name_zh || '';
    });
    const currentStepStatus = computed(() => {
      const status = exploreStore.currentStepResult?.status;
      if (status === 'running') {
        return '⏳ (运行中)';
      } else if (status === 'success') {
        return '✔️ (成功)';
      } else if (status === 'failed') {
        return '❌ (错误)';
      } else if (currentResultDict.value.timed_out) {
        return '🕑 (超时)';
      } else {
        return '';
      }
    });
    const hits = computed(() => {
      return exploreStore.latestHitsResult.output?.hits || [];
    });
    const returnHits = computed(() => {
      return exploreStore.latestHitsResult.output?.return_hits || 0;
    });
    const totalHits = computed(() => {
      return exploreStore.latestHitsResult.output?.total_hits || 0;
    });
    const isShowResultsList = computed(() => {
      return isNonEmptyArray(hits.value);
    });

    const resultsSortMethod = ref(searchStore.resultsSortMethod);

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

    function isReturnResultsLessThanTotal() {
      return returnHits.value < totalHits.value;
    }

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
      return layoutStore.dynamicResultsListClass();
    });
    const dynamicResultsListStyle = computed(() => {
      return layoutStore.dynamicResultsListStyle();
    });

    onMounted(() => {
      layoutStore.addWindowResizeListener();
    });
    onUnmounted(() => {
      layoutStore.removeWindowResizeListener();
    });

    return {
      isShowResultsList,
      currentResultDict,
      currentStepName,
      currentStepStatus,
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
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  /* Note: max-width is now dynamically applied via inline styles */
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
