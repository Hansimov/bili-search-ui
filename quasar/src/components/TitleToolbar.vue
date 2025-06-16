<template>
  <q-toolbar>
    <search-records-list-switch />
    <q-space />
    <router-link to="/">
      <q-toolbar-title>blbl.top</q-toolbar-title>
    </router-link>
    <q-space />
    <login-button />
  </q-toolbar>
</template>

<script setup lang="ts">
import SearchRecordsListSwitch from 'components/SearchRecordsListSwitch.vue';
import LoginButton from 'components/LoginButton.vue';
</script>

<style lang="scss">
.q-toolbar .q-focus-helper {
  visibility: hidden;
}
.q-toolbar a {
  text-decoration: none;
  color: inherit;
}
</style>
