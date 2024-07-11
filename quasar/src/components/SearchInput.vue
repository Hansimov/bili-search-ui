<template>
  <div class="search-input q-pb-xs">
    <q-input
      rounded
      outlined
      :dense="$route.path !== '/'"
      :class="{
        'q-pa-none': $route.path === '/',
        'q-pb-sm': $route.path !== '/',
      }"
      clearable
      placeholder="正在浏览：影视飓风"
      type="search"
      v-model="query"
      @update:model-value="suggest"
      @focus="showSuggestions"
      @blur="hideSuggestions"
      @keyup.enter="submitQuery"
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from 'boot/axios';
import { useSearchStore } from '../stores/searchStore';
import AISearchToggle from './AISearchToggle.vue';

export default {
  components: {
    AISearchToggle,
  },
  setup() {
    const searchStore = useSearchStore();
    const router = useRouter();
    const query = ref(searchStore.query || '');

    let timeoutId = null;
    const SUGGEST_DEBOUNCE_INTERVAL = 200; // millisencods

    const suggest = (newVal) => {
      searchStore.setQuery(query.value);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (newVal) {
          try {
            console.log(`> Query: [${newVal}]`);
            api.post('/suggest', { query: newVal }).then((response) => {
              searchStore.setSuggestions(response.data.hits);
              console.log(
                `+ Get ${searchStore.suggestions.length} suggestions.`
              );
            });
          } catch (error) {
            console.error(error);
          }
        } else {
          searchStore.setSuggestions([]);
        }
      }, SUGGEST_DEBOUNCE_INTERVAL);
    };

    const randomSuggest = () => {
      try {
        console.log('> Getting random suggestions ...');
        const latestSuggestPromise = api.post('/latest', { limit: 3 });
        const randomSuggestPromise = api.post('/random', {
          seed_update_seconds: 10,
          limit: 7,
        });
        Promise.all([latestSuggestPromise, randomSuggestPromise]).then(
          ([latestSuggestResponse, randomSuggestResponse]) => {
            searchStore.setSuggestions([
              ...latestSuggestResponse.data.hits,
              ...randomSuggestResponse.data.hits,
            ]);
            console.log(
              `+ Get ${searchStore.suggestions.length} random suggestions.`
            );
          }
        );
      } catch (error) {
        console.error(error);
      }
    };

    const clearSuggest = () => {
      if (!query.value && !searchStore.isMouseInSuggestionList) {
        searchStore.setSuggestions([]);
      }
    };

    const showSuggestions = async () => {
      searchStore.setIsSuggestionsVisible(true);
      if (!query.value) {
        randomSuggest();
      }
    };

    const hideSuggestions = () => {
      if (!searchStore.isMouseInSuggestionList) {
        searchStore.setIsSuggestionsVisible(false);
      }
    };

    const submitQuery = async () => {
      if (query.value) {
        searchStore.setQuery(query.value);
        router.push(`/search?q=${query.value}`);
        try {
          console.log('> Getting search results ...');
          api
            .post('/search', {
              query: searchStore.query,
              match_type: 'most_fields',
            })
            .then((response) => {
              searchStore.setResults(response.data.hits);
              console.log(
                `+ Get ${searchStore.results.length} search results.`
              );
              searchStore.setIsSuggestionsVisible(false);
            });
        } catch (error) {
          console.error(error);
        }
      }
    };

    return {
      query,
      suggest,
      randomSuggest,
      clearSuggest,
      submitQuery,
      showSuggestions,
      hideSuggestions,
      AISearchToggle,
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
