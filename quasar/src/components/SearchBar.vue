<template>
  <div class="search-bar" @mouseenter="mouseEnter" @mouseleave="mouseLeave">
    <div
      class="search-container"
      :class="{
        'q-pa-none': $route.path === '/',
        'q-pb-sm': $route.path !== '/',
      }"
    >
      <SearchInput v-show="!isEnableAiSearch" />
      <AiSearchInput v-show="isEnableAiSearch" />
      <AiSearchToggle class="ai-search-toggle-item" />
    </div>
    <div
      class="suggest-container"
      v-show="isSuggestVisible && !isEnableAiSearch"
    >
      <SuggestAuthorsList />
      <SuggestionsList />
    </div>
    <div class="ai-chat-container" v-show="isAiChatVisible && isEnableAiSearch">
      <AiChat />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import SearchInput from './SearchInput.vue';
import SuggestAuthorsList from './SuggestAuthorsList.vue';
import SuggestionsList from './SuggestionsList.vue';
import AiSearchInput from './AiSearchInput.vue';
import AiSearchToggle from './AiSearchToggle.vue';
import AiChat from './AiChat.vue';

export default {
  components: {
    SearchInput,
    SuggestAuthorsList,
    SuggestionsList,
    AiSearchInput,
    AiChat,
    AiSearchToggle,
  },
  setup() {
    const searchStore = useSearchStore();
    const isEnableAiSearch = computed(() => searchStore.isEnableAiSearch);
    const isSuggestVisible = computed(() => searchStore.isSuggestVisible);
    const isAiChatVisible = computed(() => searchStore.isAiChatVisible);
    const mouseEnter = () => {
      searchStore.setIsMouseInSearchBar(true);
    };
    const mouseLeave = () => {
      searchStore.setIsMouseInSearchBar(false);
    };
    return {
      mouseEnter,
      mouseLeave,
      isSuggestVisible,
      isAiChatVisible,
      isEnableAiSearch,
    };
  },
};
</script>

<style lang="scss" scoped>
.search-bar {
  position: relative;
}
.search-container {
  display: flex;
  align-items: center;
}
.suggest-container {
  position: absolute;
  z-index: 1000;
}
.ai-search-toggle-item {
  transform: translateX(-60px);
  width: 0px;
}
</style>
