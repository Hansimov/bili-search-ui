<template>
  <q-input
    rounded
    outlined
    clearable
    placeholder="Ask me anything ..."
    type="search"
    for="search-input"
    style="width: 680px"
    v-model="query"
    @update:model-value="suggest"
  >
    <template v-slot:prepend>
      <q-btn unelevated padding="xs"
        ><q-icon name="filter_center_focus"
      /></q-btn>
    </template>
    <template v-slot:append>
      <q-btn unelevated padding="xs"><q-icon name="search" /></q-btn>
    </template>
  </q-input>
</template>

<script>
import { ref } from 'vue';
import { api } from 'boot/axios';

export default {
  setup() {
    let timeoutId = null;
    const SUGGEST_DEBOUNCE_INTERVAL = 250; // millisencods
    const query = ref('');

    const suggest = (newVal) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (newVal) {
          try {
            console.log(`> Query: [${newVal}]`);
            api.post('/suggest', { query: newVal }).then((response) => {
              let suggestions = response.data;
              console.log(`+ Get ${suggestions.length} suggestions:`);
              console.log(suggestions);
            });
          } catch (error) {
            console.error(error);
          }
        }
      }, SUGGEST_DEBOUNCE_INTERVAL);
    };
    return {
      query,
      suggest,
    };
  },
};
</script>

<style lang="scss">
.q-focus-helper {
  visibility: hidden;
}
</style>
