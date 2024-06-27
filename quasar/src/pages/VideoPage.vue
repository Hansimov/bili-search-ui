<template>
  <q-page class="row items-center justify-evenly">
    <video-card :bvid="bvid" active></video-card>
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
