<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <TitleToolbar />
      <q-toolbar>
        <q-space />
        <SearchBar />
        <q-space />
      </q-toolbar>
      <!-- <q-toolbar class="q-pb-xs">
        <q-space />
        <ResultsTypesTab />
        <q-space />
      </q-toolbar> -->
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import TitleToolbar from 'components/TitleToolbar.vue';
import SearchBar from 'src/components/SearchBar.vue';
// import ResultsTypesTab from 'src/components/ResultsTypesTab.vue';
defineOptions({
  name: 'ResultsLayout',
});
</script>
