<template>
  <q-layout view="lHh Lpr lFf">
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
