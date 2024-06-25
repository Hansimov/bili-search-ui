<template>
  <q-page class="row items-center justify-evenly">
    <search-bar active></search-bar>
  </q-page>
</template>

<script setup lang="ts">
import SearchBar from 'components/SearchBar.vue';

defineOptions({
  name: 'IndexPage',
});
</script>
