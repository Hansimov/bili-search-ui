<template>
  <q-page class="text-center">
    <div class="header-placeholder"><br /></div>
    <div style="font-size: 4vh; opacity: 0.45">…未探索地形…</div>
    <q-btn
      class="q-mt-lg"
      size="4vh"
      text-color="blue-5"
      style="opacity: 0.75"
      unelevated
      label="回到首页"
      to="/"
      no-caps
    />
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'NotFoundPage',
});
</script>

<style lang="scss" scoped>
.header-placeholder {
  line-height: 12vh;
  text-align: center;
}
</style>
