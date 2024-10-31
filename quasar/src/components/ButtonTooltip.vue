<template>
  <q-tooltip
    anchor="top middle"
    self="center middle"
    transition-show="fade"
    transition-hide="fade"
    transition-duration="200"
    class="bg-transparent"
  >
    <span class="button-tooltip">{{ text }}</span>
  </q-tooltip>
</template>

<script>
export default {
  name: 'ButtonTooltip',
  props: {
    text: {
      type: String,
      required: true,
    },
  },
};
</script>

<style scoped>
.button-tooltip {
  font-size: 14px;
}
body.body--light .button-tooltip {
  color: coral;
  background-color: #ffffffaa;
}
body.body--dark .button-tooltip {
  background-color: #222222aa;
  color: coral;
}
</style>
