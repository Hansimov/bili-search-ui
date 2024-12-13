<template>
  <q-list v-if="isSuggestAuthorsListVisible" class="suggest-authors-list">
    <SuggestAuthorItem
      v-for="(authorItem, index) in relatedAuthorsList"
      :key="index"
      :authorName="authorItem.authorName"
      :authorInfo="authorItem.authorInfo"
    />
  </q-list>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import SuggestAuthorItem from './SuggestAuthorItem.vue';

export default {
  components: {
    SuggestAuthorItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const relatedAuthorsList = computed(() => searchStore.relatedAuthorsList);
    const isSuggestAuthorsListVisible = computed(
      () => searchStore.isSuggestAuthorsListVisible
    );
    return {
      relatedAuthorsList,
      isSuggestAuthorsListVisible,
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
