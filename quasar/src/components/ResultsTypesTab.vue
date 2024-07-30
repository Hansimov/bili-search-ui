<template>
  <q-tabs
    class="results-types-tabs"
    narrow-indicator
    align="justify"
    v-model="activeTab"
    @update:model-value="updateTab"
  >
    <q-tab name="videos" label="视频"> </q-tab>
    <q-tab name="ai" label="AI"> </q-tab>
    <q-tab name="graphs" label="图谱"> </q-tab>
  </q-tabs>
</template>

<script>
import { ref } from 'vue';
import { useSearchStore } from '../stores/searchStore';

export default {
  setup() {
    const searchStore = useSearchStore();
    const updateTab = (newActiveTab) => {
      searchStore.setActiveTab(newActiveTab);
    };
    return {
      activeTab: ref(searchStore.activeTab || 'videos'),
      updateTab,
    };
  },
};
</script>

<style>
.q-tab {
  min-height: 36px;
}
body.body--dark .q-tab {
  color: white;
}
body.body--light .q-tab {
  color: black;
}
.q-toolbar {
  min-height: 42px;
}
</style>
