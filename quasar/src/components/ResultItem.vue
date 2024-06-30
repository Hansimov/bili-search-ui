<template>
  <q-card class="result-item" clickable :to="`/video/${result.bvid}`">
    <q-card-section>
      <div class="text-subtitle1">{{ result.title }}</div>
    </q-card-section>
    <q-img :src="result.pic + coverPicSuffix" referrerpolicy="no-referrer" />
    <q-card-section>
      <div class="text-subtitle2">{{ result.owner.name }}</div>
      <div class="text-caption">{{ result.pubdate_str.slice(0, 10) }}</div>
    </q-card-section>
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
    };
  },
};
</script>

<style scoped>
.result-item {
  padding: 10px;
}
</style>
