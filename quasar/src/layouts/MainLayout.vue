<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="search" />
        <q-toolbar-title> bilibili 视频搜索 </q-toolbar-title>
        <dark-switch />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import DarkSwitch from 'components/DarkSwitch.vue';

defineOptions({
  name: 'MainLayout',
});
</script>
