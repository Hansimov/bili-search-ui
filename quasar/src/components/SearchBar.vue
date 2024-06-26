<template>
  <q-page padding>
    <div class="header-placeholder"><br /></div>
    <div class="search-bar">
      <q-input
        rounded
        outlined
        clearable
        placeholder="你是否在找：影视飓风的视频？"
        type="search"
        v-model="query"
        @update:model-value="suggest"
        @focus="randomSuggest"
        @blur="clearSuggest"
      >
        <template v-slot:prepend>
          <q-btn unelevated padding="xs"
            ><q-icon name="filter_center_focus"
          /></q-btn>
        </template>
        <template v-slot:append>
          <q-btn unelevated padding="xs"><q-icon name="search" /></q-btn>
        </template>
      </q-input>
    </div>
    <q-list
      v-if="suggestions.length"
      class="suggestions-list"
      @mouseenter="isMouseInSuggestionList = true"
      @mouseleave="isMouseInSuggestionList = false"
    >
      <q-item clickable v-for="(suggestion, index) in suggestions" :key="index">
        <q-item-section avatar class="suggestion-avatar">
          <q-icon><img src="../assets/bili-tv.svg" class="tv-icon" /></q-icon>
        </q-item-section>
        <q-item-section class="suggestion-title">
          {{ suggestion.title }}
        </q-item-section>
        <q-item-section class="suggestion-pubdate">
          {{ suggestion.pubdate.slice(0, 10) }}
        </q-item-section>
      </q-item></q-list
    >
  </q-page>
</template>

<script>
import { ref } from 'vue';
import { api } from 'boot/axios';

export default {
  setup() {
    const query = ref('');
    const suggestions = ref([]);
    const isMouseInSuggestionList = ref(false);

    let timeoutId = null;
    const SUGGEST_DEBOUNCE_INTERVAL = 200; // millisencods

    const suggest = (newVal) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (newVal) {
          try {
            console.log(`> Query: [${newVal}]`);
            api.post('/suggest', { query: newVal }).then((response) => {
              suggestions.value = response.data;
              console.log(`+ Get ${suggestions.value.length} suggestions.`);
            });
          } catch (error) {
            console.error(error);
          }
        } else {
          suggestions.value = [];
        }
      }, SUGGEST_DEBOUNCE_INTERVAL);
    };

    const randomSuggest = async () => {
      if (!query.value) {
        try {
          console.log('> Getting random suggestions...');
          api.post('/random', { seed_update_seconds: 10 }).then((response) => {
            suggestions.value = response.data;
            console.log(
              `+ Get ${suggestions.value.length} random suggestions.`
            );
          });
        } catch (error) {
          console.error(error);
        }
      }
    };

    const clearSuggest = () => {
      if (!query.value && !isMouseInSuggestionList.value) {
        suggestions.value = [];
      }
    };

    return {
      query,
      suggestions,
      isMouseInSuggestionList,
      suggest,
      randomSuggest,
      clearSuggest,
    };
  },
};
</script>

<style lang="scss">
.q-focus-helper {
  // visibility: hidden;
}
.search-bar {
  width: 780px;
  max-width: 95vw;
}
.suggestions-list {
  width: 780px;
  max-width: 95vw;
}
.suggestion-avatar {
  // todo
}
.suggestion-title {
  white-space: nowrap;
  word-wrap: break-word;
}
.suggestion-pubdate {
  text-align: right;
  opacity: 0.65;
}
.header-placeholder {
  line-height: 12vh;
  text-align: center;
}
</style>
