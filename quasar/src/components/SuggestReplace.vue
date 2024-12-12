<template>
  <div class="suggest-replace" v-if="rewritesList?.length">
    <span class="suggest-replace-rewrite"
      ><span v-for="(rewriteString, index) in rewritesList" :key="index">
        <SuggestReplaceRewriteItem
          :rewriteString="rewriteString"
          :index="index"
          :isShowRewriteIndex="isShowRewriteIndex"
          :isShowRewriteSep="isShowRewriteSepByIndex(index)"
          @searchRewritedQuery="searchRewritedQuery"
        />
      </span>
    </span>
    <span class="suggest-replace-rewrite-sep" v-if="isShowOriginal"></span>
    <span class="suggest-replace-original" v-if="isShowOriginal">
      <SuggestReplaceOriginalItem
        :keywordsString="keywordsString"
        @searchOriginalQuery="searchOriginalQuery"
      />
    </span>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import { submitQuery } from 'src/functions/search';
import SuggestReplaceRewriteItem from './SuggestReplaceRewriteItem.vue';
import SuggestReplaceOriginalItem from './SuggestReplaceOriginalItem.vue';

export default {
  components: {
    SuggestReplaceRewriteItem,
    SuggestReplaceOriginalItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const router = useRouter();
    const query = computed(() => searchStore.query);
    const suggestResultCache = computed(() => searchStore.suggestResultCache);
    const keywords = computed(
      () => searchStore.suggestResultCache[query.value]?.query_info?.keywords
    );
    const keywordsString = computed(() => (keywords.value || []).join(' '));
    const filters = computed(
      () => searchStore.suggestResultCache[query.value]?.query_info?.filters
    );
    const rewritesList = computed(
      () => searchStore.suggestResultCache[query.value]?.rewrite_info?.list
    );
    const rewritesTuples = computed(
      () => searchStore.suggestResultCache[query.value]?.rewrite_info?.tuples
    );

    const isOriginalInRewrites = computed(
      () => rewritesList.value?.includes(keywordsString.value) || false
    );
    const isShowRewriteIndex = computed(
      () => rewritesList.value?.length > 1 || !isOriginalInRewrites.value
    );
    const isShowRewriteSepByIndex = (index) => {
      return index < rewritesList.value.length - 1;
    };
    const isShowOriginal = computed(
      () => !isOriginalInRewrites.value && keywordsString.value.trim() !== ''
    );

    const searchOriginalQuery = () => {
      submitQuery(query.value, router, false, true, false);
    };
    const searchRewritedQuery = (rewriteString) => {
      const filtersString = (filters.value || []).join(' ');
      const rewriteQuery = `${rewriteString} ${filtersString}`.trim();
      submitQuery(rewriteQuery, router, false, true, false);
    };

    return {
      keywordsString,
      rewritesList,
      rewritesTuples,
      suggestResultCache,
      isOriginalInRewrites,
      isShowRewriteIndex,
      isShowRewriteSepByIndex,
      isShowOriginal,
      searchOriginalQuery,
      searchRewritedQuery,
    };
  },
};
</script>

<style>
.suggest-replace {
  padding: 4px 1rem 8px 1rem;
  line-height: 1.85;
}
.suggest-replace a {
  text-decoration: inherit;
}
.suggest-replace-original-item,
.suggest-replace-rewrite-item {
  display: inline-block;
}
.suggest-replace-rewrite-text,
.suggest-replace-original-text {
  border: 1px solid gray;
  padding: 2px 4px;
  border-radius: 4px;
}
.suggest-replace-rewrite-text {
  color: var(--main-color-d);
}
.suggest-replace-rewrite-selected {
  color: greenyellow;
}
.suggest-replace-rewrite-index,
.suggest-replace-rewrite-count,
.suggest-replace-original-index {
  color: gray;
  vertical-align: super;
  font-size: smaller;
  padding: 0px 2px;
}
.suggest-replace-rewrite-sep {
  color: gray;
  padding: 0px 2px;
}
.suggest-replace-original-text {
  color: var(--main-color-d);
}
</style>
