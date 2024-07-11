<template>
  <div class="q-px-xs q-pb-xs" v-if="searchStore.isSearchOptionsBarVisible">
    <q-toggle
      class="q-pl-xs search-options-toggle"
      icon="rocket_launch"
      :color="isEnableAISearch ? 'green' : 'grey'"
      v-model="isEnableAISearch"
      @update:model-value="toggleAISearch"
    >
      <span
        :class="{
          'text-green': isEnableAISearch,
          'text-grey': !isEnableAISearch,
        }"
      >
        语义理解
      </span>
    </q-toggle>
    <q-toggle
      class="q-pl-sm search-options-toggle"
      icon="photo"
      :color="isSearchCover ? 'blue' : 'grey'"
      v-model="isSearchCover"
    >
      <span
        :class="{
          'text-blue': isSearchCover,
          'text-grey': !isSearchCover,
        }"
      >
        搜索封面
      </span>
    </q-toggle>
    <q-toggle
      class="q-pl-sm search-options-toggle"
      icon="description"
      :color="isSearchSubtitle ? 'cyan' : 'grey'"
      v-model="isSearchSubtitle"
    >
      <span
        :class="{
          'text-cyan': isSearchSubtitle,
          'text-grey': !isSearchSubtitle,
        }"
      >
        搜索字幕
      </span>
    </q-toggle>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useSearchStore } from '../stores/searchStore';

export default {
  setup() {
    const searchStore = useSearchStore();
    const isEnableAISearch = ref(searchStore.isEnableAISearch || false);
    const toggleAISearch = (newVal) => {
      searchStore.setEnableAISearch(newVal);
    };
    return {
      isEnableAISearch,
      isSearchCover: ref(false),
      isSearchSubtitle: ref(false),
      toggleAISearch,
      searchStore,
    };
  },
};
</script>

<style lang="scss">
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
  .search-options-toggle
  .q-toggle__inner--falsy
  .q-toggle__thumb:after {
  background: #404040;
}

body.body--dark .search-options-toggle .q-toggle__thumb.q-toggle__thumb:before {
  background: #606060;
}
</style>
