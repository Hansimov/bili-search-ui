<template>
  <q-header>
    <q-toolbar>
      <q-btn flat dense no-caps icon="search" to="/">
        <q-toolbar-title> bilibili 视频搜索 </q-toolbar-title>
      </q-btn>
      <q-space />
      <dark-switch />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import DarkSwitch from 'components/DarkSwitch.vue';
</script>

<style lang="scss">
.q-toolbar .q-focus-helper {
  visibility: hidden;
}
</style>
