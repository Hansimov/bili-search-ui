<template>
  <q-page class="row items-start justify-evenly">
    <div>
      <div class="head-placeholder"><br /></div>
      <search-bar></search-bar>
      <results-list></results-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import SearchBar from 'components/SearchBar.vue';
import ResultsList from 'src/components/ResultsList.vue';

defineOptions({
  name: 'ResultsPage',
});
</script>

<style lang="scss" scoped>
.head-placeholder {
  line-height: 0vh;
  text-align: center;
}
</style>
