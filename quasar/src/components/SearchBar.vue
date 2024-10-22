<template>
  <div class="search-bar" @mouseenter="mouseEnter" @mouseleave="mouseLeave">
    <SearchInput />
    <div class="suggest-container" v-if="isSuggestVisible">
      <SuggestAuthorsList />
      <SuggestionsList />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import SearchInput from './SearchInput.vue';
import SuggestAuthorsList from './SuggestAuthorsList.vue';
import SuggestionsList from './SuggestionsList.vue';

export default {
  components: {
    SearchInput,
    SuggestAuthorsList,
    SuggestionsList,
  },
  setup() {
    const searchStore = useSearchStore();
    const isSuggestVisible = computed(() => searchStore.isSuggestVisible);
    const mouseEnter = () => {
      searchStore.setIsMouseInSearchBar(true);
    };
    const mouseLeave = () => {
      searchStore.setIsMouseInSearchBar(false);
    };
    return {
      mouseEnter,
      mouseLeave,
      isSuggestVisible,
    };
  },
};
</script>

<style lang="scss" scoped>
.search-bar {
  position: relative;
}
.suggest-container {
  position: absolute;
  z-index: 1000;
}
</style>
