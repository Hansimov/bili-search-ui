<template>
  <q-layout view="hHh lpR fFf">
    <q-header>
      <TitleToolbar />
    </q-header>
    <SearchRecordsList />
    <q-page-container>
      <q-page class="row items-start justify-evenly q-pa-none">
        <router-view />
        <q-page-sticky position="bottom" class="q-pa-lg">
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
import SearchRecordsList from 'src/components/SearchRecordsList.vue';
defineOptions({
  name: 'ResultsLayout',
});
</script>
