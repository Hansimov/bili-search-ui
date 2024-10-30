<template>
  <q-layout view="hHh lpR fFf">
    <q-header>
      <TitleToolbar />
    </q-header>
    <q-page-container>
      <q-page class="column no-padding">
        <router-view />
        <q-page-sticky position="bottom" class="q-pa-md">
          <SearchBar />
        </q-page-sticky>
      </q-page>
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
