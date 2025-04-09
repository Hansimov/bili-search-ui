<template>
  <q-btn flat @click="toggleSearchRecordsList" round dense icon="menu" />
</template>

<script setup lang="ts">
import { useLayoutStore } from 'src/stores/layoutStore';
const layoutStore = useLayoutStore();
const toggleSearchRecordsList = () => {
  layoutStore.toggleSearchRecordsList();
};
</script>
