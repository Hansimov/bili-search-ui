<template>
  <a
    :href="`https://www.bilibili.com/video/${suggestion.bvid}`"
    target="_blank"
  >
    <q-item class="suggestion-item">
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
  </a>
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
.suggestion-item {
  transition: background-color 0.25s ease, transform 0.25s ease;
}
.suggestion-item:hover {
  transform: scale(1.02);
}
body.body--light .suggestion-item:hover {
  background-color: #ddddddee;
}
body.body--dark .suggestion-item:hover {
  background-color: #444444bb;
}
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
body.body--light .suggestion-view,
body.body--light .suggestion-owner {
  color: #101010;
}
body.body--dark .suggestion-view,
body.body--dark .suggestion-owner {
  color: #f0f0f0;
}
.suggestion-pubdate {
  text-align: right;
  opacity: 0.65;
}
a {
  text-decoration: none;
  color: inherit;
}
</style>
