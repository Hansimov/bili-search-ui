<template>
  <q-page padding>
    <div class="header-placeholder"><br /></div>
    <SearchInput />
    <SuggestionsList />
  </q-page>
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

<style lang="scss">
.header-placeholder {
  line-height: 12vh;
  text-align: center;
}
</style>
