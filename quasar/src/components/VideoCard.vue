<template>
  <q-card flat class="video-card">
    <q-card-section class="result-title q-px-sm q-pt-none q-pb-xs">
      {{ videoDetails?.title }}
    </q-card-section>
    <q-item class="q-px-sm q-pt-none q-pb-xs">
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-regular fa-play-circle"></q-icon>
          {{ videoDetails?.stat.view }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-regular fa-commenting"></q-icon>
          {{ videoDetails?.stat.reply }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-align-left"></q-icon>
          {{ videoDetails?.stat.danmaku }}
        </q-item-label>
      </q-item-section>
      <q-item-section></q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon
            ><img
              :src="videoDetails?.owner.face + userPicSuffix"
              class="rounded-borders"
              referrerpolicy="no-referrer"
          /></q-icon>
          {{ videoDetails?.owner.name }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          {{ videoDetails?.pubdate_str }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-video
      class="video-embed q-px-sm q-pt-none q-pb-xs"
      :src="`//player.bilibili.com/player.html?bvid=${bvid}`"
    />
    <q-item class="q-px-sm q-pt-none q-pb-xs">
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-thumbs-up"> </q-icon>
          {{ videoDetails?.stat.like }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-soccer-ball"> </q-icon>
          {{ videoDetails?.stat.coin }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-star"></q-icon>
          {{ videoDetails?.stat.favorite }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-share"></q-icon>
          {{ videoDetails?.stat.share }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-card-section class="result-desc q-px-sm q-pt-none q-pb-xs">
      {{ videoDetails?.desc }}
    </q-card-section>
  </q-card>
</template>

<script>
import { api } from 'boot/axios';
import constants from '../stores/constants.json';

export default {
  props: {
    bvid: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      videoDetails: null,
      userPicSuffix: constants.userPicSuffix,
    };
  },
  methods: {
    async fetchVideoDetails() {
      try {
        const response = await api.post('/doc', { bvid: this.bvid });
        this.videoDetails = response.data;
      } catch (error) {
        console.error('Failed to fetch video details:', error);
      }
    },
  },
  mounted() {
    this.fetchVideoDetails();
  },
};
</script>

<style lang="scss" scoped>
.video-card {
  background-color: transparent;
  width: var(--video-embed-width);
  max-width: var(--video-embed-max-width);
}
.video-embed {
  height: var(--video-embed-height);
  max-height: var(--video-embed-max-height);
}
.result-title {
  font-size: 1.25rem;
  font-weight: bold;
  opacity: 0.8;
}
.result-desc {
  font-size: 1.1em;
  opacity: 0.8;
}
</style>
