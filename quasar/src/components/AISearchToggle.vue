<template>
  <q-toggle
    :color="isEnableAISearch ? 'green' : 'grey'"
    class="q-px-none ai-search-toggle"
    v-model="isEnableAISearch"
    :icon="isEnableAISearch ? 'fa-solid fa-rocket' : ''"
    @update:model-value="toggleIsEnableAISearch"
    ><q-tooltip
      anchor="center left"
      self="center right"
      transition-show="fade"
      transition-hide="fade"
      class="bg-transparent q-px-none"
    >
      <span
        class="search-tooltip"
        :class="{
          'text-green': isEnableAISearch,
          'text-grey': !isEnableAISearch,
        }"
        >AI 搜索 {{ isEnableAISearch ? '已启用' : '已关闭' }}</span
      >
    </q-tooltip>
  </q-toggle>
</template>

<script>
import { ref } from 'vue';
import { useSearchStore } from '../stores/searchStore';

export default {
  setup() {
    const searchStore = useSearchStore();
    const toggleIsEnableAISearch = (newVal) => {
      searchStore.setIsEnableAISearch(newVal);
    };
    const isEnableAISearch = ref(searchStore.isEnableAISearch || false);
    return {
      isSearchCover: ref(false),
      isSearchSubtitle: ref(false),
      isEnableAISearch,
      toggleIsEnableAISearch,
      searchStore,
    };
  },
};
</script>

<style lang="scss">
.search-tooltip {
  font-size: 14px;
}
body.body--light .q-toggle__inner--falsy .q-toggle__track {
  background: #c0c0c0;
}
body.body--dark .q-toggle__inner--falsy .q-toggle__track {
  background: #505050;
}
body.body--light .q-toggle__inner--falsy .q-toggle__thumb:after {
  background: #f0f0f0;
}
body.body--dark
  .ai-search-toggle
  .q-toggle__inner--falsy
  .q-toggle__thumb:after {
  background: #404040;
}
body.body--dark .ai-search-toggle .q-toggle__thumb.q-toggle__thumb:before {
  background: #606060;
}
</style>
