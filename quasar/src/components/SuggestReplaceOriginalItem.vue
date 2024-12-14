<template>
  <span class="suggest-replace-original-item">
    <a
      href="#"
      class="suggest-replace-original-text"
      @click.prevent="searchOriginalQuery"
      >{{ keywordsString }}
    </a>
    <span class="suggest-replace-original-index">
      {{ isSuggestionsListVisible ? '原文' : '暂无结果' }}
    </span>
  </span>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
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
  setup() {
    const searchStore = useSearchStore();
    const isSuggestionsListVisible = computed(
      () => searchStore.isSuggestionsListVisible
    );
    return {
      isSuggestionsListVisible,
    };
  },
};
</script>
