<template>
  <q-list
    v-if="suggestions.length"
    class="suggestions-list"
    @mouseenter="mouseEnter"
    @mouseleave="mouseLeave"
  >
    <SuggestionItem
      v-for="(suggestion, index) in suggestions"
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
    return {
      mouseEnter,
      mouseLeave,
      suggestions,
    };
  },
};
</script>

<style lang="scss" scoped>
.suggestions-list {
  width: 780px;
  max-width: 95vw;
}
</style>
