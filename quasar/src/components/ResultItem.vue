<template>
  <q-card class="result-item" clickable :to="`/video/${result.bvid}`">
    <q-card-section>
      <div class="text-h6">{{ result.title }}</div>
    </q-card-section>
    <q-card-section>
      <div class="text-subtitle2">{{ result.owner.name }}</div>
    </q-card-section>
    <q-card-section>
      <div class="text-caption">{{ result.pubdate_str.slice(0, 10) }}</div>
    </q-card-section>
  </q-card>
</template>

<script>
export default {
  props: {
    result: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style scoped>
.result-item {
  padding: 20px;
}
</style>
