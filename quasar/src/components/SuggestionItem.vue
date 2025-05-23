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
          · <span class="suggestion-owner" v-html="highlightedOwnerName"></span>
        </span>
      </q-item-section>
      <q-item-section side class="suggestion-tname-pubdate">
        <span class="suggestion-tname">{{ suggestion.tname }}</span>
        <span class="suggestion-pubdate">{{ highlightedPubdateStr }}</span>
      </q-item-section>
    </q-item>
  </a>
</template>

<script>
import { humanReadableNumber } from 'src/utils/convert';
import { tsToYmd } from 'src/utils/convert';
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
        this.suggestion.highlights?.merged &&
        this.suggestion.highlights?.merged.title
      ) {
        return this.suggestion.highlights?.merged.title[0];
      } else {
        return this.suggestion.title;
      }
    },
    highlightedOwnerName() {
      if (
        this.suggestion.highlights?.merged &&
        this.suggestion.highlights?.merged['owner.name']
      ) {
        return this.suggestion.highlights?.merged['owner.name'][0];
      } else {
        return this.suggestion.owner.name;
      }
    },
    highlightedPubdateStr() {
      return tsToYmd(this.suggestion?.pubdate);
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
  color: var(--main-color-l);
}
body.body--dark .suggestion-title {
  color: var(--main-color-d);
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
