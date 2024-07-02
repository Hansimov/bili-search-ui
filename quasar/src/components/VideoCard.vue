<template>
  <q-card flat class="video-card">
    <q-card-section
      class="result-title q-px-sm q-pt-none q-pb-xs"
      v-if="videoDetails"
    >
      <a :href="`https://www.bilibili.com/video/${bvid}`" target="_blank">
        {{ videoDetails?.title }}
        <q-tooltip
          anchor="center end"
          self="center left"
          transition-show="fade"
          transition-hide="fade"
          class="bg-transparent"
        >
          <q-icon size="xs"><img src="../assets/bili-tv.svg" /></q-icon>
          <span class="title-tooltip">前往B站观看</span>
        </q-tooltip>
      </a>
    </q-card-section>
    <q-item class="q-px-sm q-pt-none q-pb-xs" v-if="videoDetails">
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-regular fa-play-circle"></q-icon>
          <span>{{ videoDetails?.stat.view }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-regular fa-commenting"></q-icon>
          <span>{{ videoDetails?.stat.reply }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-align-left"></q-icon>
          <span>{{ videoDetails?.stat.danmaku }}</span>
        </q-item-label>
      </q-item-section>
      <template
        v-for="(honor, index) in videoDetails.honor_reply.honor"
        :key="index"
      >
        <q-item-section side v-if="honor.type === 2 || honor.type === 3">
          <q-item-label>
            <q-badge outline>
              <span>{{ honor.desc }}</span>
            </q-badge>
          </q-item-label>
        </q-item-section>
      </template>
      <q-item-section></q-item-section>
      <q-item-section side>
        <q-item-label>
          <a
            :href="`https://space.bilibili.com/${videoDetails?.owner.mid}/video`"
            target="_blank"
          >
            {{ videoDetails?.owner.name }} <q-badge outline>UP</q-badge>
          </a>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>{{ videoDetails?.pubdate_str }} </q-item-label>
      </q-item-section>
    </q-item>
    <q-video
      class="video-embed q-px-sm q-pt-none q-pb-xs"
      :src="`//player.bilibili.com/player.html?bvid=${bvid}`"
    />
    <q-item class="q-px-sm q-pt-none q-pb-xs" v-if="videoDetails">
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-thumbs-up"> </q-icon>
          <span>{{ videoDetails?.stat.like }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-soccer-ball"> </q-icon>
          <span>{{ videoDetails?.stat.coin }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-star"></q-icon>
          <span>{{ videoDetails?.stat.favorite }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-share"></q-icon>
          <span>{{ videoDetails?.stat.share }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section></q-item-section>
      <q-item-section side>
        <q-item-label>
          数据更新于：{{ videoDetails?.record_date_str }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-card-section
      class="result-desc q-px-sm q-pt-none q-pb-xs"
      v-if="videoDetails"
    >
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
.q-card a,
.q-item__label a,
.q-badge {
  text-decoration: none;
  color: inherit;
}
.q-item__label span {
  vertical-align: -4%;
}
.q-item__label span::before {
  content: '\00a0';
}
.title-tooltip {
  font-size: 14px;
  vertical-align: -12%;
}
.title-tooltip::before {
  content: '\00a0';
}
</style>
