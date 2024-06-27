<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <index-header />
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import IndexHeader from 'components/IndexHeader.vue';
defineOptions({
  name: 'MainLayout',
});
</script>
