<template>
  <q-item clickable :to="`/video/${suggestion.bvid}`">
    <q-item-section
      v-show="$q.screen.gt.sm"
      avatar
      side
      class="suggestion-avatar"
    >
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
.suggestion-title-view-owner {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
.suggestion-view {
  opacity: 0.65;
}
.suggestion-view i {
  vertical-align: 1%;
}
body.body--light .suggestion-title {
  color: var(--main-color-light);
}
body.body--dark .suggestion-title {
  color: var(--main-color-dark);
}
body.body--dark .suggestion-owner {
  color: #f0f0f0;
}
.suggestion-pubdate {
  text-align: right;
  opacity: 0.65;
}
</style>
