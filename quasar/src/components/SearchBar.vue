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
        <div class="search-sub-space-top"></div>
        <SearchOptionsBar />
        <SuggestReplace />
        <q-separator
          inset
          class="suggest-component-sep"
          v-if="isSuggestAuthorsListVisible"
        />
        <SuggestAuthorsList />
        <q-separator
          inset
          class="suggest-component-sep"
          v-if="isSuggestionsListVisible"
        />
        <SuggestionsList />
        <div class="search-sub-space-bottom"></div>
      </div>

      <div
        class="aichat-container"
        v-show="isEnableAiSearch && isAiChatVisible"
        :class="{
          'aichat-container-reverse': !isIndexRoute,
        }"
      >
        <div class="search-sub-space-top"></div>
        <AiSearchOptionsBar />
        <AiChat />
        <div class="search-sub-space-bottom"></div>
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
import SuggestReplace from './SuggestReplace.vue';
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
    SuggestReplace,
    AiSearchInput,
    AiSearchOptionsBar,
    AiChat,
    AiSearchToggle,
  },
  setup() {
    const searchStore = useSearchStore();
    const isQueryEmpty = computed(() => searchStore.isQueryEmpty);
    const isEnableAiSearch = computed(() => searchStore.isEnableAiSearch);
    const isSuggestVisible = computed(() => searchStore.isSuggestVisible);
    const isSuggestionsListVisible = computed(
      () => searchStore.isSuggestionsListVisible
    );
    const isSuggestRepaceVisible = computed(
      () => searchStore.isSuggestReplaceVisible
    );
    const isSuggestAuthorsListVisible = computed(
      () => searchStore.isSuggestAuthorsListVisible
    );
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
      isQueryEmpty,
      isSuggestVisible,
      isSuggestionsListVisible,
      isSuggestRepaceVisible,
      isSuggestAuthorsListVisible,
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
  padding: 0px 0px 0px 5px;
  width: var(--search-input-width);
  max-width: var(--search-input-max-width);
}
.search-sub-top {
  top: 65px;
}
.search-sub-bottom {
  bottom: 48px;
}

.search-sub-space-top {
  padding-top: 0px;
  padding-bottom: 0px;
}
.search-sub-space-bottom {
  padding-top: 2px;
  padding-bottom: 2px;
}

.suggest-component-sep {
  margin-top: 0px;
  margin-bottom: 0px;
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
