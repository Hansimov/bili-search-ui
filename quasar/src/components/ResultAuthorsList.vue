<template>
  <q-list class="result-authors-list" v-if="isShowAuthorsList">
    <ResultAuthorItem
      v-for="(authorItem, index) in authors"
      :key="index"
      :authorItem="authorItem"
    />
  </q-list>
</template>

<script>
import { computed } from 'vue';
import { useExploreStore } from 'src/stores/exploreStore';
import { isNonEmptyDict } from 'src/stores/resultStore';
import ResultAuthorItem from './ResultAuthorItem.vue';

export default {
  components: {
    ResultAuthorItem,
  },
  setup() {
    const exploreStore = useExploreStore();
    const authors = computed(
      () => exploreStore.latestAuthorsResult.output?.authors
    );
    const isShowAuthorsList = computed(() => {
      return isNonEmptyDict(authors.value);
    });
    return {
      authors,
      isShowAuthorsList,
    };
  },
};
</script>

<style lang="scss" scoped>
.result-authors-list {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  justify-content: flex-start;
  // height: 50px;
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
