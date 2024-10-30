<template>
  <slot name="top" v-if="relatedAuthorsList.length"></slot>
  <q-list v-if="relatedAuthorsList.length" class="suggest-authors-list">
    <SuggestAuthorItem
      v-for="(authorItem, index) in relatedAuthorsList"
      :key="index"
      :authorName="authorItem.authorName"
      :authorInfo="authorItem.authorInfo"
    />
  </q-list>
  <slot name="bottom" v-if="relatedAuthorsList.length"></slot>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import SuggestAuthorItem from './SuggestAuthorItem.vue';

const sortAuthors = (a, b) => {
  const highlightedA = a.authorInfo.highlighted || false;
  const highlightedB = b.authorInfo.highlighted || false;

  // sort by highlighted, true is first
  if (highlightedA !== highlightedB) {
    return highlightedA ? -1 : 1;
  }
  // sort by count, larger is higher
  return b.authorInfo.count - a.authorInfo.count;
};

export default {
  components: {
    SuggestAuthorItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const query = computed(() => searchStore.query);
    const relatedAuthorsList = computed(() => {
      const relatedAuthors =
        searchStore.suggestResultCache[query.value]?.related_authors || {};
      const authorsList = Object.entries(relatedAuthors).map(
        ([authorName, authorInfo]) => ({
          authorName,
          authorInfo,
        })
      );
      return authorsList.sort(sortAuthors);
    });

    return {
      relatedAuthorsList,
    };
  },
};
</script>

<style lang="scss" scoped>
.suggest-authors-list {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  justify-content: flex-start;
  height: 60px;
  width: calc(var(--search-input-width) - var(--search-input-width-more));
  max-width: calc(
    var(--search-input-max-width) - var(--search-input-width-more)
  );
  z-index: 1000;
  &::-webkit-scrollbar {
    height: 8px;
    background: transparent;
  }
}
</style>
