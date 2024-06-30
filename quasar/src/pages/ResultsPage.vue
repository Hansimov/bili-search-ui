<template>
  <q-page-container class="row items-start justify-evenly">
    <q-page>
      <results-list></results-list>
      <q-page-sticky position="top">
        <div class="head-placeholder"><br /></div>
        <search-bar></search-bar>
      </q-page-sticky>
    </q-page>
  </q-page-container>
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
