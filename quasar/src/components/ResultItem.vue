<template>
  <q-card flat class="result-item q-py-sm">
    <q-card-section class="result-cover q-px-sm q-pt-none q-pb-xs">
      <router-link :to="`/video/${result.bvid}`" target="_blank">
        <q-img
          :src="result.pic + coverPicSuffix"
          referrerpolicy="no-referrer"
          class="rounded-borders"
        >
        </q-img>
      </router-link>
    </q-card-section>
    <q-card-section class="q-px-sm q-pt-none q-pb-xs">
      <router-link :to="`/video/${result.bvid}`" target="_blank">
        <div class="result-title" v-html="highlightedTitle"></div>
      </router-link>
    </q-card-section>
    <q-item class="q-px-sm q-pt-none q-pb-xs result-bottom">
      <q-item-section class="result-owner-name">
        <div v-html="highlightedOwnerName"></div>
      </q-item-section>
      <q-item-section side class="result-pubdate">
        {{ result.pubdate_str.slice(0, 10) }}
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script>
import constants from '../stores/constants.json';

export default {
  props: {
    result: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      coverPicSuffix: constants.coverPicSuffix,
      userPicSuffix: constants.userPicSuffix,
    };
  },
  computed: {
    highlightedTitle() {
      if (
        this.result.pinyin_highlights &&
        this.result.pinyin_highlights['title.pinyin']
      ) {
        return this.result.pinyin_highlights['title.pinyin'][0];
      } else if (
        this.result.common_highlights &&
        this.result.common_highlights.title
      ) {
        return this.result.common_highlights.title[0];
      } else {
        return this.result.title;
      }
    },
    highlightedOwnerName() {
      if (
        this.result.pinyin_highlights &&
        this.result.pinyin_highlights['owner.name.pinyin']
      ) {
        return this.result.pinyin_highlights['owner.name.pinyin'][0];
      } else if (
        this.result.common_highlights &&
        this.result.common_highlights['owner.name']
      ) {
        return this.result.common_highlights['owner.name'][0];
      } else {
        return this.result.owner.name;
      }
    },
  },
};
</script>

<style scoped>
.result-item {
  background-color: transparent;
}

.result-owner-avatar,
.result-pubdate {
  flex: 0 0 auto;
}
.result-owner-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
  opacity: 0.7;
}
.result-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: var(--result-title-font-size);
  line-height: var(--result-title-line-height);
  height: calc(2 * var(--result-title-line-height));
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
.result-title:hover {
  color: #60c0f0;
}
.q-card a {
  text-decoration: none;
  color: inherit;
}
.q-item {
  min-height: var(--result-title-line-height);
}
</style>
