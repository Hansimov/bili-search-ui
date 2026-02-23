<template>
  <div class="search-bar" @mouseenter="mouseEnter" @mouseleave="mouseLeave">
    <div class="search-container">
      <SearchInput />
    </div>
    <div
      class="search-sub-container"
      :class="{
        'search-sub-top': isIndexRoute,
        'search-sub-bottom': !isIndexRoute,
        'search-sub-bordered': isSuggestVisible && hasSuggestContent,
      }"
    >
      <div
        class="suggest-container"
        v-show="isSuggestVisible && hasSuggestContent"
        :class="{
          'suggest-container-reverse': !isIndexRoute,
        }"
      >
        <div class="search-sub-space-top"></div>

        <!-- 智能补全建议（输入内容时显示） -->
        <SmartSuggestions v-if="!isQueryEmpty" />

        <!-- 纠错建议 -->
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

        <!-- 搜索历史（无输入时显示） -->
        <SearchHistoryPanel v-if="isQueryEmpty" />

        <div class="search-sub-space-bottom"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSearchStore } from 'src/stores/searchStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import SearchInput from './SearchInput.vue';
import SuggestAuthorsList from './SuggestAuthorsList.vue';
import SuggestionsList from './SuggestionsList.vue';
import SuggestReplace from './SuggestReplace.vue';
import SmartSuggestions from './SmartSuggestions.vue';
import SearchHistoryPanel from './SearchHistoryPanel.vue';

export default {
  components: {
    SearchInput,
    SuggestAuthorsList,
    SuggestionsList,
    SuggestReplace,
    SmartSuggestions,
    SearchHistoryPanel,
  },
  setup() {
    const searchStore = useSearchStore();
    const layoutStore = useLayoutStore();
    const isQueryEmpty = computed(() => searchStore.isQueryEmpty);
    const isSuggestVisible = computed(() => layoutStore.isSuggestVisible);
    const isSuggestionsListVisible = computed(
      () => searchStore.isSuggestionsListVisible
    );
    const isSuggestRepaceVisible = computed(
      () => searchStore.isSuggestReplaceVisible
    );
    const isSuggestAuthorsListVisible = computed(
      () => searchStore.isSuggestAuthorsListVisible
    );
    // 有任何下拉内容要显示
    const hasSuggestContent = computed(() => {
      if (!isQueryEmpty.value) return true; // SmartSuggestions will show
      return true; // SearchHistoryPanel will show
    });
    const $route = useRoute();
    const isIndexRoute = computed(() => $route.path === '/');
    const mouseEnter = () => {
      layoutStore.setIsMouseInSearchBar(true);
    };
    const mouseLeave = () => {
      layoutStore.setIsMouseInSearchBar(false);
    };
    return {
      mouseEnter,
      mouseLeave,
      isQueryEmpty,
      isSuggestVisible,
      hasSuggestContent,
      isSuggestionsListVisible,
      isSuggestRepaceVisible,
      isSuggestAuthorsListVisible,
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
  top: calc(100% + 8px);
}
.search-sub-bottom {
  bottom: calc(100% + 8px);
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

.suggest-container {
  display: flex;
  flex-direction: column;
}
.suggest-container-reverse {
  flex-direction: column-reverse;
}
</style>
