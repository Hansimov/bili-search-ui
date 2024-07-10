<template>
  <div>
    <SearchOptionsBar />
    <SearchInput />
    <SuggestionsList />
  </div>
</template>

<script>
import SearchInput from './SearchInput.vue';
import SuggestionsList from './SuggestionsList.vue';
import SearchOptionsBar from './SearchOptionsBar.vue';

export default {
  components: {
    SearchInput,
    SuggestionsList,
    SearchOptionsBar,
  },
};
</script>
