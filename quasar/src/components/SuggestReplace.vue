<template>
  <div class="suggest-replace">
    智能改写：<a
      href="#"
      class="suggest-replace-rewrite"
      @click.prevent="searchRewritedQuery"
      >{{ keywordsRewrited }}</a
    >，仍然搜索：<a
      href="#"
      class="suggest-replace-original"
      @click.prevent="searchOriginalQuery"
      >{{ keywordsOriginal }}</a
    >
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
    const originalQuery = computed(() => searchStore.query);
    const keywordsOriginal = computed(
      () =>
        searchStore.suggestResultCache[originalQuery.value]?.keywords_original
    );
    const keywordsRewrited = computed(
      () =>
        searchStore.suggestResultCache[originalQuery.value]?.keywords_rewrited
    );
    const searchOriginalQuery = () => {
      submitQuery(originalQuery.value, router, false, true, false);
    };
    const searchRewritedQuery = () => {
      submitQuery(originalQuery.value, router, false, true, true);
    };

    return {
      keywordsOriginal,
      keywordsRewrited,
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
.suggest-replace-rewrite {
  color: greenyellow;
}
.suggest-replace-original {
  color: var(--main-color-d);
}
</style>
