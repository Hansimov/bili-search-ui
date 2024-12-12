<template>
  <span class="suggest-replace-original-item">
    <a
      href="#"
      class="suggest-replace-original-text"
      @click.prevent="searchOriginalQuery"
      >{{ keywordsString }}
    </a>
    <span class="suggest-replace-original-index">原文</span>
  </span>
</template>

<script>
export default {
  props: {
    keywordsString: {
      type: String,
      required: true,
    },
  },
  methods: {
    searchOriginalQuery() {
      this.$emit('searchOriginalQuery');
    },
  },
};
</script>
