<template>
  <q-layout view="hHh Lpr lFf">
    <q-header>
      <TitleToolbar />
    </q-header>
    <SearchRecordsList />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import TitleToolbar from 'components/TitleToolbar.vue';
import SearchRecordsList from 'src/components/SearchRecordsList.vue';
defineOptions({
  name: 'IndexLayout',
});
</script>
