<template>
  <div
    class="fullscreen bg-black text-blue text-center q-pa-md flex flex-center"
  >
    <div>
      <div style="font-size: 6vh; opacity: 0.5">…这里什么也没有…</div>
      <q-btn
        class="q-mt-xl"
        size="6vh"
        color="black"
        text-color="blue-5"
        style="opacity: 0.75"
        unelevated
        to="/"
        label="回到首页"
        no-caps
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ErrorNotFound',
});
</script>
