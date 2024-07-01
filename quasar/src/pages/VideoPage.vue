<template>
  <q-page class="row items-start justify-evenly">
    <div>
      <div class="head-placeholder"><br /></div>
      <video-card :bvid="bvid" active></video-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import VideoCard from 'components/VideoCard.vue';

const route = useRoute();
const bvid = route.params.bvid as string;

defineOptions({
  name: 'VideoPage',
});
</script>

<style scoped>
.head-placeholder {
  line-height: 2vh;
  text-align: center;
}
</style>
