<template>
  <pre class="json-block">
      {{ jsonBlock }}
  </pre>
</template>

<script>
export default {
  name: 'JsonViewer',
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  computed: {
    jsonBlock() {
      try {
        return JSON.stringify(this.data, null, 2).trim();
      } catch (e) {
        return `Error: \n${e.message}`;
      }
    },
  },
};
</script>

<style scoped>
.json-block {
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  white-space: pre;
  width: 95vw;
}
</style>
