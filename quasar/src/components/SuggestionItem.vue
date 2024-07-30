<template>
  <q-item clickable :to="`/video/${suggestion.bvid}`">
    <q-item-section avatar side class="suggestion-avatar">
      <q-icon><img src="../assets/bili-tv.svg" class="tv-icon" /></q-icon>
    </q-item-section>
    <q-item-section class="suggestion-title-view-owner">
      <span class="suggestion-title" v-html="highlightedTitle"></span>
      <span>
        <span class="suggestion-view"
          ><q-icon name="fa-regular fa-play-circle"></q-icon>
          {{ humanReadableNumber(suggestion.stat.view) }}</span
        >
        · <span class="suggestion-owner">{{ suggestion.owner.name }}</span>
      </span>
    </q-item-section>
    <q-item-section side class="suggestion-tname-pubdate">
      <span class="suggestion-tname">{{ suggestion.tname }}</span>
      <span class="suggestion-pubdate">{{
        suggestion.pubdate_str.slice(0, 10)
      }}</span>
    </q-item-section>
  </q-item>
</template>

<script>
import { humanReadableNumber } from 'src/utils/convert';
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
        this.suggestion.pinyin_highlights &&
        this.suggestion.pinyin_highlights['title.pinyin']
      ) {
        return this.suggestion.pinyin_highlights['title.pinyin'][0];
      } else if (
        this.suggestion.common_highlights &&
        this.suggestion.common_highlights.title
      ) {
        return this.suggestion.common_highlights.title[0];
      } else {
        return this.suggestion.title;
      }
    },
  },
  setup() {
    return {
      humanReadableNumber,
    };
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
body.body--light .suggestion-title {
  color: #202020;
}
body.body--dark .suggestion-title {
  color: #e0e0e0;
}
</style>
