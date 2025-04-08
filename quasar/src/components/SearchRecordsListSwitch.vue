<template>
  <q-btn flat @click="toggleSearchRecordsList" round dense icon="menu" />
</template>

<script setup lang="ts">
import { useRecordsStore } from 'src/stores/recordsStore';
const recordsStore = useRecordsStore();
const toggleSearchRecordsList = () => {
  recordsStore.toggleSearchRecordsList();
};
</script>
