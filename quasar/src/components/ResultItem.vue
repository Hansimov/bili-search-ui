<template>
  <q-card flat class="result-item q-pt-none q-pb-sm">
    <q-card-section class="q-px-xs q-pt-none q-pb-xs">
      <router-link :to="`/video/${result.bvid}`" target="_blank">
        <q-img
          :src="result.pic + coverPicSuffix"
          referrerpolicy="no-referrer"
          class="rounded-borders result-item-cover"
          no-transition
          no-spinner
        >
          <span
            class="text-caption absolute-bottom text-center result-bottom-bar"
          ></span>
          <span
            class="text-caption absolute-top text-center result-top-bar"
          ></span>
          <span class="text-caption absolute-top text-left result-score">
            {{ result?.score.toFixed(1) }}
          </span>
          <span class="text-caption absolute-top text-right result-tname">
            {{ result?.tname }}
          </span>
          <span class="text-caption absolute-bottom text-left result-view">
            <q-icon name="fa-regular fa-play-circle"></q-icon>
            {{ humanReadableNumber(result?.stat.view) }}
          </span>
          <span class="text-caption absolute-bottom text-right result-duration">
            {{ secondsToDuration(result?.duration) }}
          </span>
        </q-img>
      </router-link>
    </q-card-section>
    <q-card-section class="q-px-xs q-pt-none q-pb-xs">
      <a
        :href="`https://www.bilibili.com/video/${result.bvid}`"
        target="_blank"
      >
        <div class="result-title" v-html="highlightedTitle()"></div>
      </a>
    </q-card-section>
    <q-item class="q-px-xs q-pt-none q-pb-xs result-bottom">
      <q-item-section side class="result-owner-name">
        <a
          :href="`https://space.bilibili.com/${result.owner.mid}/video`"
          target="_blank"
        >
          <div v-html="highlightedOwnerName()"></div>
        </a>
      </q-item-section>
      <q-item-section></q-item-section>
      <q-item-section side class="result-pubdate">
        <div v-html="highlightedPubdateStr()"></div>
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script>
import constants from '../stores/constants.json';
import { humanReadableNumber, secondsToDuration } from 'src/utils/convert';

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
  methods: {
    highlightedTitle() {
      if (
        this.result.highlights?.merged &&
        this.result.highlights?.merged['title']
      ) {
        return this.result.highlights?.merged['title'][0];
      } else {
        return this.result.title;
      }
    },
    highlightedOwnerName() {
      if (
        this.result.highlights?.merged &&
        this.result.highlights?.merged['owner.name']
      ) {
        return this.result.highlights?.merged['owner.name'][0];
      } else {
        return this.result.owner.name;
      }
    },
    highlightedPubdateStr() {
      if (
        this.result.highlights?.common &&
        this.result.highlights?.common['pubdate_str']
      ) {
        let pubdate_str = this.result.highlights?.common['pubdate_str'][0];
        return pubdate_str.split(' ')[0];
      } else {
        return this.result.pubdate_str.slice(0, 10);
      }
    },
    humanReadableNumber,
    secondsToDuration,
  },
};
</script>

<style scoped>
.result-item {
  background-color: transparent;
  max-width: var(--result-item-width);
}
.result-item-cover {
  max-width: 240px;
  max-height: 140px;
}
@media (max-width: 520px) {
  .result-item-cover {
    max-height: calc(40vw * 140 / 224);
  }
}
.result-item {
  transition: transform 0.25s ease, filter 0.3s ease;
}
.result-item:hover {
  transform: scale(1.025);
}
body.body--light .result-item:hover {
  background: linear-gradient(#ffffff00, #eeeeeeee);
  filter: contrast(1.25) saturate(1.15) brightness(1.05);
}
body.body--dark .result-item:hover {
  background: linear-gradient(#22222200, #55555555);
  filter: contrast(1.25) saturate(1.15) brightness(1.1);
}
.result-owner-avatar,
.result-pubdate {
  flex: 0 0 auto;
  opacity: 0.9;
}
.result-owner-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
  opacity: 0.9;
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
  opacity: 0.85;
}
body.body--light .result-owner-name:hover,
body.body--light .result-title:hover {
  color: #0080d0;
  opacity: 1;
}
body.body--dark .result-owner-name:hover,
body.body--dark .result-title:hover {
  color: #60c0f0;
  opacity: 1;
}
.q-card a {
  text-decoration: none;
  color: inherit;
}
.q-item {
  min-height: var(--result-title-line-height);
}
.result-score,
.result-tname,
.result-view,
.result-duration {
  padding: 2px 5px 0px 5px;
  font-size: 14px;
  background: transparent;
  color: white;
}
.result-top-bar,
.result-bottom-bar {
  background: rgba(0, 0, 0, 0.4);
  padding: 12px 0px 12px 0px;
}
.q-img i {
  vertical-align: 2%;
}
</style>
