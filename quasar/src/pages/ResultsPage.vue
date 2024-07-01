<template>
  <q-page class="row items-start justify-evenly q-pa-none">
    <results-list class="results-list"></results-list>
    <q-page-sticky position="top" class="search-bar-row">
      <div class="head-placeholder"><br /></div>
      <search-bar></search-bar>
    </q-page-sticky>
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
body.body--light .search-bar-row {
  background: white;
}
body.body--dark .search-bar-row {
  background: var(--q-dark-page);
}
.head-placeholder {
  line-height: 0vh;
  text-align: center;
}
.results-list {
  margin-top: 60px;
}
</style>
