<template>
  <span class="suggest-replace-rewrite-item">
    <a
      class="suggest-replace-rewrite-text"
      href="#"
      @click.prevent="searchRewritedQuery(rewriteString)"
      >{{ rewriteString }}
    </a>
    <span class="suggest-replace-rewrite-index" v-if="isShowRewriteIndex">{{
      index + 1
    }}</span>
    <span class="suggest-replace-rewrite-sep" v-if="isShowRewriteSep"> </span>
  </span>
</template>

<script>
export default {
  props: {
    rewriteString: {
      type: String,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    isShowRewriteIndex: {
      type: Boolean,
      required: true,
    },
    isShowRewriteSep: {
      type: Boolean,
      required: true,
    },
  },
  methods: {
    searchRewritedQuery(rewriteString) {
      this.$emit('searchRewritedQuery', rewriteString);
    },
  },
};
</script>
