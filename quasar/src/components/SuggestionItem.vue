<template>
  <q-item clickable :to="`/video/${suggestion.bvid}`">
    <q-item-section avatar side class="suggestion-avatar">
      <q-icon><img src="../assets/bili-tv.svg" class="tv-icon" /></q-icon>
    </q-item-section>
    <q-item-section class="suggestion-title">
      <div v-html="highlightedTitle"></div>
    </q-item-section>
    <q-item-section side class="suggestion-owner">
      {{ suggestion.owner.name }}
    </q-item-section>
    <q-item-section side class="suggestion-pubdate">
      {{ suggestion.pubdate_str.slice(0, 10) }}
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
  computed: {
    highlightedTitle() {
      if (
        this.suggestion.common_highlights &&
        this.suggestion.common_highlights.title
      ) {
        return this.suggestion.common_highlights.title[0];
      } else if (
        this.suggestion.pinyin_highlights &&
        this.suggestion.pinyin_highlights['title.pinyin']
      ) {
        console.log('highlightedTitle');
        return this.suggestion.pinyin_highlights['title.pinyin'][0];
      } else {
        return this.suggestion.title;
      }
    },
  },
};
</script>

<style scoped>
.suggestion-avatar,
.suggestion-owner,
.suggestion-pubdate {
  flex: 0 0 auto;
}
.suggestion-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
.suggestion-pubdate {
  text-align: right;
  opacity: 0.65;
}
</style>
