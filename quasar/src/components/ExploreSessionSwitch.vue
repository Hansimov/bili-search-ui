<template>
  <span class="explore-session-switch q-pr-md">
    <q-btn
      flat
      dense
      icon="fa-solid fa-rotate-left"
      class="session-btn q-pr-sm"
      :disable="!exploreStore.isSessionHasPrev()"
      :title="prevSessionLabel"
      @click="exploreStore.toPrevSession()"
    />
    <q-btn
      flat
      dense
      icon="fa-solid fa-rotate-right"
      class="session-btn"
      :disable="!exploreStore.isSessionHasNext()"
      :title="nextSessionLabel"
      @click="exploreStore.toNextSession()"
    />
    <q-btn
      flat
      dense
      icon="fa-solid fa-trash-can"
      class="session-btn"
      title="清除会话"
      @click="exploreStore.clearSession()"
      v-if="false"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useExploreStore } from 'src/stores/exploreStore';

const exploreStore = useExploreStore();

const getSessionLabel = (idx: number): string => {
  if (idx < 0 || idx >= exploreStore.exploreSessions.length) return '';
  return exploreStore.exploreSessions[idx].query || '';
};

const prevSessionLabel = computed(() => {
  return getSessionLabel(exploreStore.currentSessionIdx - 1) || '';
});

const nextSessionLabel = computed(() => {
  return getSessionLabel(exploreStore.currentSessionIdx + 1) || '';
});
</script>

<style scoped>
.session-btn {
  border-radius: 6px;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  box-shadow: none !important;
}
.session-btn .q-icon {
  font-size: 1.1em;
}
</style>

<style>
body.body--light .explore-session-switch .session-btn {
  background-color: transparent;
  color: rgba(0, 0, 0, 0.7);
}
body.body--light .explore-session-switch .session-btn:hover:not([disabled]) {
  background-color: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.9);
}
body.body--dark .explore-session-switch .session-btn {
  background-color: transparent;
  color: rgba(255, 255, 255, 0.7);
}
body.body--dark .explore-session-switch .session-btn:hover:not([disabled]) {
  background-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}
</style>
