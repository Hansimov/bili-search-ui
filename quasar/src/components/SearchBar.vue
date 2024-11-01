<template>
  <div class="search-bar" @mouseenter="mouseEnter" @mouseleave="mouseLeave">
    <div class="search-container">
      <SearchInput v-show="!isEnableAiSearch" />
      <AiSearchInput v-show="isEnableAiSearch" />
      <AiSearchToggle class="ai-search-toggle-item" />
    </div>
    <div
      class="search-sub-container"
      :class="{
        'search-sub-top': isIndexRoute,
        'search-sub-bottom': !isIndexRoute,
        'search-sub-bordered':
          (isSuggestVisible && !isEnableAiSearch) ||
          (isAiChatVisible && isEnableAiSearch),
      }"
    >
      <div
        class="suggest-container"
        v-show="!isEnableAiSearch && isSuggestVisible"
        :class="{
          'suggest-container-reverse': !isIndexRoute,
        }"
      >
        <SearchOptionsBar />
        <SuggestAuthorsList>
          <template v-slot:bottom>
            <q-separator inset />
          </template>
          <template v-slot:top>
            <q-separator inset />
          </template>
        </SuggestAuthorsList>
        <SuggestionsList />
      </div>

      <div
        class="aichat-container"
        v-show="isEnableAiSearch && isAiChatVisible"
        :class="{
          'aichat-container-reverse': !isIndexRoute,
        }"
      >
        <AiSearchOptionsBar />
        <AiChat />
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import SearchInput from './SearchInput.vue';
import SearchOptionsBar from './SearchOptionsBar.vue';
import SuggestAuthorsList from './SuggestAuthorsList.vue';
import SuggestionsList from './SuggestionsList.vue';
import AiSearchInput from './AiSearchInput.vue';
import AiSearchToggle from './AiSearchToggle.vue';
import AiChat from './AiChat.vue';
import AiSearchOptionsBar from './AiSearchOptionsBar.vue';

export default {
  components: {
    SearchInput,
    SearchOptionsBar,
    SuggestAuthorsList,
    SuggestionsList,
    AiSearchInput,
    AiSearchOptionsBar,
    AiChat,
    AiSearchToggle,
  },
  setup() {
    const searchStore = useSearchStore();
    const isEnableAiSearch = computed(() => searchStore.isEnableAiSearch);
    const isSuggestVisible = computed(() => searchStore.isSuggestVisible);
    const isAiChatVisible = computed(() => searchStore.isAiChatVisible);
    const $route = useRoute();
    const isIndexRoute = computed(() => $route.path === '/');
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
      isIndexRoute,
    };
  },
};
</script>

<style lang="scss" scoped>
.search-bar {
  position: relative;
  display: flex;
  justify-content: center;
}
.search-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-sub-container {
  position: absolute;
  z-index: 1000;
  border-radius: 8px;
  padding: 5px 0px 0px 5px;
}
.search-sub-top {
  top: 65px;
}
.search-sub-bottom {
  bottom: 48px;
}
body.body--light {
  .search-sub-container {
    background-color: #ffffffee;
  }
  .search-sub-bordered {
    border: 1px solid #00000044;
  }
}
body.body--dark {
  .search-sub-container {
    background-color: #111111ee;
  }
  .search-sub-bordered {
    border: 1px solid #eeeeee44;
  }
}

.ai-search-toggle-item {
  transform: translateX(-60px);
  width: 0px;
}
.suggest-container {
  display: flex;
  flex-direction: column;
}
.suggest-container-reverse {
  flex-direction: column-reverse;
}
.aichat-container {
  display: flex;
  flex-direction: column;
}
.aichat-container-reverse {
  flex-direction: column-reverse;
}
</style>
