<template>
  <div class="suggest-replace" v-if="rewritesList?.length">
    <span class="suggest-replace-rewrite"
      ><span v-for="(rewriteString, index) in rewritesList" :key="index">
        <a
          class="suggest-replace-rewrite-text"
          href="#"
          @click.prevent="searchRewritedQuery(rewriteString)"
          >{{ rewriteString }}
        </a>
        <span
          class="suggest-replace-rewrite-index"
          v-if="rewritesList.length > 1 || !isOriginalInRewrites"
          >{{ index + 1 }}</span
        >
        <span
          class="suggest-replace-rewrite-sep"
          v-if="index < rewritesList.length - 1"
        >
        </span> </span
    ></span>
    <span class="suggest-replace-rewrite-sep"></span>
    <span
      class="suggest-replace-original"
      v-if="!isOriginalInRewrites && keywordsString.trim() !== ''"
      ><a
        href="#"
        class="suggest-replace-original-text"
        @click.prevent="searchOriginalQuery"
        >{{ keywordsString }}
      </a>
      <span class="suggest-replace-original-index">原文</span>
    </span>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import { submitQuery } from 'src/functions/search';

export default defineComponent({
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
    const searchOriginalQuery = () => {
      submitQuery(query.value, router, false, true, false);
    };
    const searchRewritedQuery = (rewriteString) => {
      const filtersString = (filters.value || []).join(' ');
      const rewriteQuery = `${rewriteString} ${filtersString}`.trim();
      submitQuery(rewriteQuery, router, false, true, false);
    };
    const isOriginalInRewrites = computed(
      () => rewritesList.value?.includes(keywordsString.value) || false
    );

    return {
      keywordsString,
      rewritesList,
      rewritesTuples,
      suggestResultCache,
      isOriginalInRewrites,
      searchOriginalQuery,
      searchRewritedQuery,
    };
  },
});
</script>

<style scoped>
.suggest-replace {
  padding: 0px 1rem 4px 1rem;
  line-height: 1.75;
}
.suggest-replace a {
  text-decoration: inherit;
}
.suggest-replace-rewrite-text,
.suggest-replace-original-text {
  display: inline-block;
  border: 1px solid gray;
  padding: 0px 4px;
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
