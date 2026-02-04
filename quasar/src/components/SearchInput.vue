<template>
  <div class="search-input q-pa-none">
    <q-input
      rounded
      outlined
      :dense="$route.path !== '/'"
      :placeholder="searchInputPlaceholder"
      type="search"
      v-model="query"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup.enter="submitQueryInInput(true)"
      @update:model-value="handleInputComplete"
    >
      <template v-slot:prepend>
        <q-btn unelevated class="q-px-none">
          <q-icon name="search" color="blue-5" />
        </q-btn>
      </template>
    </q-input>
  </div>
</template>

<script>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { suggest, randomSuggest } from 'src/functions/search';
import { explore } from 'src/functions/explore';

export default {
  setup() {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const exploreStore = useExploreStore();
    const route = useRoute();
    const query = computed({
      get: () => queryStore.query || '',
      set: (value) =>
        queryStore.setQuery({
          newQuery: value,
        }),
    });

    const handleBlur = () => {
      if (!layoutStore.isMouseInSearchBar) {
        layoutStore.setIsSuggestVisible(false);
      }
    };

    const handleFocus = async () => {
      if (
        !layoutStore.isSuggestVisible &&
        !layoutStore.isMouseInAiSearchToggle
      ) {
        layoutStore.setIsSuggestVisible(true);
      }
      if (!query.value) {
        randomSuggest();
      } else {
        // if (!searchStore.suggestions.length) {
        //   suggest(query.value);
        // }
      }
    };

    const handleGlobalClick = () => {
      if (!layoutStore.isMouseInSearchBar) {
        layoutStore.setIsSuggestVisible(false);
      }
    };

    const handleInputComplete = () => undefined;

    onMounted(() => {
      document.addEventListener('click', handleGlobalClick);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleGlobalClick);
    });

    const submitQueryInInput = async (setRoute = false) => {
      await explore({
        queryValue: query.value,
        setQuery: true,
        setRoute: setRoute,
      });
      layoutStore.setCurrentPage(1);
    };

    // this is triggered when open url (route) with `search?q=...`
    // Use watch instead of immediate check to avoid duplicate calls
    watch(
      () => route.query.q,
      (newQuery, oldQuery) => {
        if (newQuery && newQuery !== oldQuery) {
          // Skip if we're restoring a session (navigation from session switch)
          if (exploreStore.isRestoringSession) {
            return;
          }
          // Only trigger if query changed and we're not already loading
          const currentQuery = queryStore.query;
          if (newQuery !== currentQuery || !exploreStore.isExploreLoading) {
            queryStore.setQuery({
              newQuery: String(newQuery),
            });
            if (
              !exploreStore.hasResults ||
              exploreStore.isExploreLoading === false
            ) {
              submitQueryInInput(false);
            }
          }
        }
      },
      { immediate: true }
    );

    const searchInputPlaceholder = computed(() => {
      const now = new Date();
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      };
      const now_str = new Intl.DateTimeFormat('zh-CN', options).format(now);
      return `访问时间：${now_str}`;
    });

    return {
      query,
      handleFocus,
      handleBlur,
      suggest,
      handleInputComplete,
      randomSuggest,
      submitQueryInInput,
      searchInputPlaceholder,
    };
  },
};
</script>

<style lang="scss">
.search-input {
  width: var(--search-input-width);
  max-width: var(--search-input-max-width);
}
.search-input .q-focus-helper {
  visibility: hidden;
}
</style>
