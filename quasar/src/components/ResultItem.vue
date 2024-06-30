<template>
  <q-card class="result-item" clickable :to="`/video/${result.bvid}`">
    <q-card-section>
      <div class="text-subtitle1">{{ result.title }}</div>
    </q-card-section>
    <q-img
      :src="
        'https://hansimov-data-proxy-api.hf.space/img?url=' +
        result.pic +
        '@320w_200h_1c_!web-space-upload-video.webp'
      "
    />
    <q-card-section>
      <div class="text-subtitle2">{{ result.owner.name }}</div>
      <div class="text-caption">{{ result.pubdate_str.slice(0, 10) }}</div>
    </q-card-section>
  </q-card>
</template>

<script>
import config from '../stores/config.json';

export default {
  props: {
    result: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      coverPicPrefix: config.coverPicPrefix,
      coverPicSuffix: config.coverPicSuffix,
    };
  },
};
</script>

<style scoped>
.result-item {
  padding: 10px;
}
</style>
