<template>
  <q-card flat class="video-card">
    <q-card-section
      class="result-title q-px-sm q-pt-none q-pb-xs"
      v-if="videoInfo"
    >
      <a :href="`https://www.bilibili.com/video/${bvid}`" target="_blank">
        {{ videoInfo?.title }}
        <q-tooltip
          anchor="center end"
          self="center left"
          transition-show="fade"
          transition-hide="fade"
          class="bg-transparent"
          v-if="$q.screen.gt.md"
        >
          <q-icon size="xs"><img src="../assets/bili-tv.svg" /></q-icon>
          <span class="title-tooltip">前往B站观看</span>
        </q-tooltip>
      </a>
    </q-card-section>
    <q-item class="q-px-sm q-pt-none q-pb-sm" v-if="videoInfo">
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-regular fa-play-circle"></q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.view) }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-align-left"></q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.danmaku) }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-regular fa-commenting"></q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.reply) }}</span>
        </q-item-label>
      </q-item-section>
      <template
        v-for="(honor, index) in videoInfo?.honor_reply?.honor"
        :key="index"
      >
        <q-item-section
          side
          v-if="(honor.type === 2 || honor.type === 3) && $q.screen.gt.xs"
        >
          <q-item-label>
            <q-badge outline>
              {{ honor.desc }}
            </q-badge>
          </q-item-label>
        </q-item-section>
      </template>
      <q-item-section></q-item-section>
      <q-item-section side>
        <q-item-label>
          <a
            :href="`https://space.bilibili.com/${videoInfo?.owner.mid}/video`"
            target="_blank"
          >
            {{ videoInfo?.owner.name }} <q-badge outline>UP</q-badge>
          </a>
        </q-item-label>
      </q-item-section>
      <q-item-section side v-if="$q.screen.gt.xs">
        <q-item-label>{{ tsToYmd(videoInfo?.pubdate) }} </q-item-label>
      </q-item-section>
    </q-item>
    <q-video
      class="video-embed q-px-sm q-pt-none q-pb-xs"
      :src="`//player.bilibili.com/player.html?bvid=${bvid}`"
    />
    <q-item class="q-px-sm q-pt-xs q-pb-none" v-if="videoInfo">
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-thumbs-up"> </q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.like) }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-soccer-ball"> </q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.coin) }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-star"></q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.favorite) }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>
          <q-icon name="fa-solid fa-share"></q-icon>
          <span>{{ humanReadableNumber(videoInfo?.stat.share) }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section></q-item-section>
      <q-item-section side v-if="$q.screen.gt.xs">
        <q-item-label>
          数据更新于：{{ videoInfo?.insert_at_str }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item
      class="q-px-sm q-pt-none q-pb-xs"
      v-if="videoInfo && videoInfo?.staff"
    >
      <q-item-section
        side
        v-for="(staff, index) in videoInfo?.staff"
        v-show="index >= 0"
        :key="index"
      >
        <q-item-label>
          <a
            :href="`https://space.bilibili.com/${staff?.mid}/video`"
            target="_blank"
          >
            {{ staff.name }} <q-badge outline> {{ staff.title }} </q-badge>
          </a>
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-card-section
      class="result-desc q-px-sm q-pt-none q-pb-xs"
      v-if="videoInfo"
    >
      {{ videoInfo?.desc }}
    </q-card-section>
  </q-card>
</template>

<script>
import { api } from 'boot/axios';
import constants from '../stores/constants.json';
import { humanReadableNumber, tsToYmd } from 'src/utils/convert';

export default {
  props: {
    bvid: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      videoInfo: null,
      userPicSuffix: constants.userPicSuffix,
    };
  },
  methods: {
    async fetchVideoInfo() {
      try {
        const response = await api.post('/doc', { bvid: this.bvid });
        this.videoInfo = response.data;
      } catch (error) {
        console.error('Failed to fetch video details:', error);
      }
    },
    humanReadableNumber,
    tsToYmd,
  },
  mounted() {
    this.fetchVideoInfo();
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
.q-item {
  min-height: 40px;
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
