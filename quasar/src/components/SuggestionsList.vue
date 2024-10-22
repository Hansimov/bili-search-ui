<template>
  <q-list
    v-if="suggestions.length && isSuggestionsVisible"
    class="suggestions-list q-pt-xs"
    @mouseenter="mouseEnter"
    @mouseleave="mouseLeave"
  >
    <SuggestionItem
      v-for="(suggestion, index) in suggestions.slice(0, 10)"
      :key="index"
      :suggestion="suggestion"
    />
  </q-list>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import SuggestionItem from './SuggestionItem.vue';

export default {
  components: {
    SuggestionItem,
  },
  setup() {
    const searchStore = useSearchStore();
    const mouseEnter = () => {
      searchStore.setIsMouseInSuggestionList(true);
    };
    const mouseLeave = () => {
      searchStore.setIsMouseInSuggestionList(false);
    };
    const suggestions = computed(() => searchStore.suggestions);
    const isSuggestionsVisible = computed(
      () => searchStore.isSuggestionsVisible
    );
    return {
      mouseEnter,
      mouseLeave,
      suggestions,
      isSuggestionsVisible,
    };
  },
};
</script>

<style lang="scss" scoped>
.suggestions-list {
  position: absolute;
  width: var(--search-input-width);
  max-width: var(--search-input-max-width);
  z-index: 1000;
}
</style>
