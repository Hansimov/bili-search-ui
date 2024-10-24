<template>
  <div class="search-bar" @mouseenter="mouseEnter" @mouseleave="mouseLeave">
    <component :is="isEnableAiSearch ? 'AiSearchInput' : 'SearchInput'" />
    <div class="suggest-container" v-if="isSuggestVisible && !isEnableAiSearch">
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
import AiSearchInput from './AiSearchInput.vue';

export default {
  components: {
    SearchInput,
    SuggestAuthorsList,
    SuggestionsList,
    AiSearchInput,
  },
  setup() {
    const searchStore = useSearchStore();
    const isSuggestVisible = computed(() => searchStore.isSuggestVisible);
    const isEnableAiSearch = computed(() => searchStore.isEnableAiSearch);
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
      isEnableAiSearch,
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
