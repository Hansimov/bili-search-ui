<template>
  <q-list
    v-if="suggestions.length"
    class="suggestions-list"
    @mouseenter="mouseEnter"
    @mouseleave="mouseLeave"
  >
    <q-item clickable v-for="(suggestion, index) in suggestions" :key="index">
      <q-item-section avatar class="suggestion-avatar">
        <q-icon><img src="../assets/bili-tv.svg" class="tv-icon" /></q-icon>
      </q-item-section>
      <q-item-section class="suggestion-title">
        {{ suggestion.title }}
      </q-item-section>
      <q-item-section class="suggestion-pubdate">
        {{ suggestion.pubdate.slice(0, 10) }}
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script>
export default {
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

<style lang="scss">
.suggestions-list {
  width: 780px;
  max-width: 95vw;
}
.suggestion-avatar {
  // todo
}
.suggestion-title {
  white-space: nowrap;
  word-wrap: break-word;
}
.suggestion-pubdate {
  text-align: right;
  opacity: 0.65;
}
</style>
