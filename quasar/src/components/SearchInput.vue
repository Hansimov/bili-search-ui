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
      @keyup.enter="submitQueryInInput(false)"
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { suggest, randomSuggest } from 'src/functions/search';
import { explore } from 'src/functions/explore';

export default {
  setup() {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const route = useRoute();
    const router = useRouter();
    const query = ref(queryStore.query || route.query.q || '');

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

    const submitQueryInInput = async (isFromURL = false) => {
      await explore({
        queryValue: query.value,
        router: router,
        isFromURL: isFromURL,
      });
      layoutStore.setCurrentPage(1);
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
