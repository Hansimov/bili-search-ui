<template>
  <div class="search-bar">
    <SearchInput />
    <div class="suggest-container">
      <SuggestAuthorsList />
      <SuggestionsList />
    </div>
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

<style lang="scss" scoped>
.search-bar {
  position: relative;
}
.suggest-container {
  position: absolute;
  z-index: 1000;
}
</style>
