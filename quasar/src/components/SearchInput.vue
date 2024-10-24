<template>
  <div class="search-input q-pa-none">
    <q-input
      rounded
      outlined
      :dense="$route.path !== '/'"
      :placeholder="searchInputPlaceholder"
      type="search"
      v-model="query"
      @update:model-value="suggest"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup.enter="submitQueryInInput(false)"
    >
      <template v-slot:prepend>
        <q-btn unelevated class="q-px-xs">
          <q-icon name="search" />
        </q-btn>
      </template>
    </q-input>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import { suggest, randomSuggest, submitQuery } from '../functions/search';

export default {
  setup() {
    const searchStore = useSearchStore();
    const route = useRoute();
    const router = useRouter();
    const query = ref(searchStore.query || route.query.q || '');

    const handleBlur = () => {
      if (!searchStore.isMouseInSearchBar) {
        searchStore.setIsSuggestVisible(false);
      }
    };

    const handleFocus = async () => {
      if (
        !searchStore.isSuggestVisible &&
        !searchStore.isMouseInAiSearchToggle
      ) {
        searchStore.setIsSuggestVisible(true);
      }
      if (!query.value) {
        randomSuggest();
      } else {
        if (!searchStore.suggestions.length) {
          suggest(query.value);
        }
      }
    };

    const handleGlobalClick = () => {
      if (!searchStore.isMouseInSearchBar) {
        searchStore.setIsSuggestVisible(false);
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleGlobalClick);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleGlobalClick);
    });

    const submitQueryInInput = async (isFromURL = false) => {
      await submitQuery(query.value, router, isFromURL);
    };

    if (query.value) {
      submitQueryInInput(query.value);
    }

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
