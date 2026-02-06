<template>
  <q-layout view="hHh lpr lFf">
    <q-header>
      <TitleToolbar />
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import TitleToolbar from 'components/TitleToolbar.vue';
defineOptions({
  name: 'IndexLayout',
});
</script>
