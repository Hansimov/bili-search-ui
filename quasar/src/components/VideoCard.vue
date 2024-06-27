<template>
  <q-card>
    <q-video
      class="video-embed"
      :src="`//player.bilibili.com/player.html?bvid=${bvid}`"
    />
  </q-card>
</template>

<script setup lang="ts">
defineProps({
  bvid: String,
});
</script>

<style lang="scss">
.video-embed {
  width: 720px;
  max-width: 95vw;
  height: 480px;
  max-height: 95vh;
}
</style>
