<template>
  <q-list v-if="isSuggestionsListVisible" class="suggestions-list q-pt-xs">
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
    const suggestions = computed(() => searchStore.suggestions);
    const isSuggestionsListVisible = computed(
      () => searchStore.isSuggestionsListVisible
    );
    return {
      suggestions,
      isSuggestionsListVisible,
    };
  },
};
</script>

<style lang="scss" scoped>
.suggestions-list {
  width: calc(var(--search-input-width) - var(--search-input-width-more));
  max-width: calc(
    var(--search-input-max-width) - var(--search-input-width-more)
  );
  max-height: min(300px, calc(100vh - 100px));
  overflow-y: scroll;
  overflow-x: hidden;
  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
}
</style>
