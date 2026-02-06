<template>
  <div class="suggest-replace" v-if="isSuggestReplaceVisible">
    <span class="suggest-replace-rewrite"
      ><span v-for="(rewriteString, index) in rewritesList" :key="index">
        <SuggestReplaceRewriteItem
          :rewriteString="rewriteString"
          :index="index"
          :isRewrited="isRewrited"
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
import { useQueryStore } from '../stores/queryStore';
import { useSearchStore } from '../stores/searchStore';
import { explore } from 'src/functions/explore';
import SuggestReplaceRewriteItem from './SuggestReplaceRewriteItem.vue';
import SuggestReplaceOriginalItem from './SuggestReplaceOriginalItem.vue';

export default {
  components: {
    SuggestReplaceRewriteItem,
    SuggestReplaceOriginalItem,
  },
  setup() {
    const queryStore = useQueryStore();
    const searchStore = useSearchStore();
    const query = computed(() => queryStore.query);
    const suggestResultCache = computed(() => searchStore.suggestResultCache);
    const keywords = computed(
      () =>
        searchStore.suggestResultCache[query.value]?.query_info?.keywords_body
    );
    const keywordsString = computed(() => (keywords.value || []).join(' '));
    const filters = computed(
      () => searchStore.suggestResultCache[query.value]?.query_info?.filters
    );
    const rewritesList = computed(
      () => searchStore.rewrite_info?.rewrited_word_exprs
    );
    const isRewrited = computed(() => searchStore.rewrite_info?.rewrited);
    const isOriginalInRewrites = computed(
      () => searchStore.rewrite_info?.is_original_in_rewrites || false
    );
    const isSuggestReplaceVisible = computed(
      () => searchStore.isSuggestReplaceVisible
    );
    const isShowRewriteIndex = computed(
      () => rewritesList.value?.length >= 1 || !isOriginalInRewrites.value
    );
    const isShowRewriteSepByIndex = (index) => {
      return index < rewritesList.value.length - 1;
    };
    const isShowOriginal = computed(
      () => !isOriginalInRewrites.value && keywordsString.value.trim() !== ''
    );

    const searchOriginalQuery = () => {
      explore({
        queryValue: query.value,
        setQuery: true,
        setRoute: true,
      });
    };
    const searchRewritedQuery = (rewriteString) => {
      const filtersString = (filters.value || []).join(' ');
      const rewriteQueryValue = `${rewriteString} ${filtersString}`.trim();
      explore({
        queryValue: rewriteQueryValue,
        setQuery: true,
        setRoute: true,
      });
    };

    return {
      keywordsString,
      rewritesList,
      isRewrited,
      suggestResultCache,
      isOriginalInRewrites,
      isSuggestReplaceVisible,
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
  padding: 2px 1rem 2px 1rem;
  margin: 2px 0px 2px 0px;
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
