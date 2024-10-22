<template>
  <div class="search-input q-pa-none">
    <q-input
      rounded
      outlined
      :dense="$route.path !== '/'"
      :class="{
        'q-pa-none': $route.path === '/',
        'q-pb-sm': $route.path !== '/',
      }"
      clearable
      :placeholder="searchInputPlaceholder"
      type="search"
      v-model="query"
      @update:model-value="suggest"
      @focus="triggerSuggestions"
      @blur="hideSuggestions"
      @keyup.enter="submitQuery(false)"
    >
      <template v-slot:prepend>
        <q-btn unelevated class="q-px-xs">
          <q-icon name="search" />
        </q-btn>
      </template>
      <template v-slot:append>
        <AISearchToggle />
      </template>
    </q-input>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'boot/axios';
import { useSearchStore } from '../stores/searchStore';
import AISearchToggle from './AISearchToggle.vue';

export default {
  components: {
    AISearchToggle,
  },
  setup() {
    const searchStore = useSearchStore();
    const route = useRoute();
    const router = useRouter();
    const query = ref(searchStore.query || route.query.q || '');

    const triggerSuggestions = async () => {
      if (!searchStore.isSuggestionsVisible) {
        searchStore.setIsSuggestionsVisible(true);
      }
      if (!query.value) {
        randomSuggest();
      } else {
        if (!searchStore.suggestions.length) {
          suggest(query.value);
        }
      }
    };

    const hideSuggestions = () => {
      if (!searchStore.isMouseInSuggestionList) {
        searchStore.setIsSuggestionsVisible(false);
      }
    };

    let timeoutId = null;
    let cached_suggest;
    const SUGGEST_DEBOUNCE_INTERVAL = 150; // millisencods

    let suggestAbortController = new AbortController();
    let searchAbortController = new AbortController();

    const suggest = (newVal) => {
      searchStore.setQuery(newVal);
      if (!searchStore.isSuggestionsVisible) {
        searchStore.setIsSuggestionsVisible(true);
      }
      clearTimeout(timeoutId);
      suggestAbortController.abort();
      suggestAbortController = new AbortController();

      cached_suggest = searchStore.suggestResultCache[newVal];
      if (cached_suggest) {
        searchStore.setSuggestions(cached_suggest.hits);
        console.log(`+ Cached Query: [${newVal}]`);
        console.log('Cached suggest results:', cached_suggest);
        return;
      }

      timeoutId = setTimeout(async () => {
        if (newVal) {
          try {
            console.log(`> Query: [${newVal}]`);
            const response = await api.post(
              '/suggest',
              { query: newVal, limit: 25 },
              { signal: suggestAbortController.signal }
            );
            if (suggestAbortController.signal.aborted) {
              return;
            }
            const suggesResult = response.data;
            searchStore.setSuggestResultCache(newVal, suggesResult);
            searchStore.setSuggestions(suggesResult.hits);
            console.log(`+ Get ${searchStore.suggestions.length} suggestions.`);
          } catch (error) {
            if (error.name === 'CanceledError') {
              // console.log('Previous request aborted');
            } else {
              console.error(error);
            }
          }
        } else {
          // searchStore.setSuggestions([]);
        }
      }, SUGGEST_DEBOUNCE_INTERVAL);
    };

    const randomSuggest = () => {
      try {
        console.log('> Getting random suggestions ...');
        const randomSuggestPromise = api.post('/random', {
          seed_update_seconds: 10,
          limit: 10,
        });
        randomSuggestPromise.then((randomSuggestResponse) => {
          searchStore.setSuggestions([...randomSuggestResponse.data.hits]);
          console.log(
            `+ Got ${searchStore.suggestions.length} random suggestions.`
          );
        });
      } catch (error) {
        console.error(error);
      }
    };

    const clearSuggest = () => {
      if (!query.value && !searchStore.isMouseInSuggestionList) {
        searchStore.setSuggestions([]);
      }
    };

    const submitQuery = async (isFromURL = false) => {
      hideSuggestions();
      if (query.value) {
        searchStore.setQuery(query.value);
        if (!isFromURL) {
          await router.push(`/search?q=${query.value}`);
        }
        try {
          console.log('> Getting search results ...');
          searchAbortController.abort();
          searchAbortController = new AbortController();
          let cached_suggest = searchStore.suggestResultCache[query.value];
          if (!cached_suggest) {
            suggest(query.value);
            cached_suggest = searchStore.suggestResultCache[query.value];
          }

          let suggest_info = {};
          if (cached_suggest && Object.keys(cached_suggest).length > 0) {
            suggest_info = {
              highlighted_keywords: cached_suggest.highlighted_keywords || {},
              related_authors: cached_suggest.related_authors || [],
            };
          }
          const response = await api.post(
            '/search',
            {
              query: query.value,
              suggest_info: suggest_info,
              limit: 200,
            },
            { signal: suggestAbortController.signal }
          );
          if (searchAbortController.signal.aborted) {
            return;
          }
          searchStore.setSearchResult(response.data);
          console.log(
            `+ Get ${searchStore.results.hits.length} search results.`
          );
        } catch (error) {
          console.error(error);
        }
      }
    };

    if (query.value) {
      submitQuery(query.value);
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
      suggest,
      randomSuggest,
      clearSuggest,
      triggerSuggestions,
      hideSuggestions,
      AISearchToggle,
      submitQuery,
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
