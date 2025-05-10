<template>
  <span class="explore-session-switch q-pr-md">
    <q-btn
      dense
      icon="fa-solid fa-rotate-left"
      class="q-pr-sm"
      :disable="!exploreStore.isSessionHasPrev()"
      @click="exploreStore.toPrevSession()"
    />
    <q-btn
      dense
      icon="fa-solid fa-rotate-right"
      :disable="!exploreStore.isSessionHasNext()"
      @click="exploreStore.toNextSession()"
    />
    <q-btn
      dense
      icon="fa-solid fa-trash-can"
      @click="exploreStore.clearSession()"
      v-if="false"
    >
    </q-btn>
  </span>
</template>

<script setup lang="ts">
import { useExploreStore } from 'src/stores/exploreStore';
const exploreStore = useExploreStore();
</script>

<style>
.explore-session-switch .q-btn .q-icon {
  font-size: 1.1em;
}
</style>
