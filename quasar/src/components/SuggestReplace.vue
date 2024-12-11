<template>
  <div class="suggest-replace">
    猜你想搜：<span v-for="(rewriteString, index) in rewritesList" :key="index">
      <a
        class="suggest-replace-rewrite-item"
        href="#"
        @click.prevent="searchRewritedQuery(rewriteString)"
        >{{ rewriteString }}
      </a>
    </span>
    ，仍然搜索：<a
      href="#"
      class="suggest-replace-original"
      @click.prevent="searchOriginalQuery"
      >{{ keywordsString }}
    </a>
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
      searchOriginalQuery,
      searchRewritedQuery,
    };
  },
});
</script>

<style scoped>
.suggest-replace {
  padding: 8px;
}
.suggest-replace a {
  text-decoration: inherit;
}
.suggest-replace-rewrite-item {
  color: greenyellow;
  border: 1px dashed gray;
  padding: 2px;
}
.suggest-replace-original {
  color: var(--main-color-d);
}
</style>
