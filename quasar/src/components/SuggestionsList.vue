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
import SuggestionItem from './SuggestionItem.vue';

export default {
  components: {
    SuggestionItem,
  },
  props: {
    suggestions: {
      type: Array,
      required: true,
    },
    isMouseInSuggestionList: {
      type: Boolean,
      required: true,
    },
  },
  methods: {
    mouseEnter() {
      this.$emit('mouse-enter');
    },
    mouseLeave() {
      this.$emit('mouse-leave');
    },
  },
};
</script>

<style lang="scss" scoped>
.suggestions-list {
  width: 780px;
  max-width: 95vw;
}
</style>
