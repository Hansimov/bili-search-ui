<template>
  <q-toggle
    :color="isEnableAiSearch ? 'teal' : 'grey'"
    class="q-px-none ai-search-toggle"
    v-model="isEnableAiSearch"
    :icon="isEnableAiSearch ? 'fa-solid fa-bolt' : ''"
    @update:model-value="toggleIsEnableAiSearch"
    @mouseover="mouseEnter"
    @mouseleave="mouseLeave"
    ><q-tooltip
      anchor="center left"
      self="center right"
      transition-show="fade"
      transition-hide="fade"
      class="bg-transparent q-px-none ai-search-tooltip"
    >
      <span
        class="search-tooltip"
        :class="{
          'text-teal': isEnableAiSearch,
          'text-grey': !isEnableAiSearch,
        }"
      >
        AI {{ isEnableAiSearch ? '已启用' : '已关闭' }}</span
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
    const toggleIsEnableAiSearch = (newVal) => {
      searchStore.setIsEnableAiSearch(newVal);
    };
    const isEnableAiSearch = ref(searchStore.isEnableAiSearch || false);
    const mouseEnter = () => {
      searchStore.setIsMouseInAiSearchToggle(true);
    };
    const mouseLeave = () => {
      searchStore.setIsMouseInAiSearchToggle(false);
    };
    return {
      isEnableAiSearch,
      toggleIsEnableAiSearch,
      mouseEnter,
      mouseLeave,
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
.ai-search-tooltip {
  transform: translateX(14px);
}
</style>
