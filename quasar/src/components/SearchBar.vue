<template>
  <div class="search-bar">
    <SearchInput />
    <SuggestionsList />
  </div>
</template>

<script>
import SearchInput from './SearchInput.vue';
import SuggestionsList from './SuggestionsList.vue';

export default {
  components: {
    SearchInput,
    SuggestionsList,
  },
};
</script>
