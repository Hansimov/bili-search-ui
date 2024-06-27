<template>
  <q-item clickable>
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
</template>

<script>
export default {
  props: {
    suggestion: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style lang="scss" scoped>
.suggestion-title {
  white-space: nowrap;
  word-wrap: break-word;
}
.suggestion-pubdate {
  text-align: right;
  opacity: 0.65;
}
</style>
