<template>
  <div class="search-bar">
    <SearchInput />
    <SuggestAuthorsList />
    <SuggestionsList />
  </div>
</template>

<script>
import SearchInput from './SearchInput.vue';
import SuggestAuthorsList from './SuggestAuthorsList.vue';
import SuggestionsList from './SuggestionsList.vue';

export default {
  components: {
    SearchInput,
    SuggestAuthorsList,
    SuggestionsList,
  },
};
</script>
