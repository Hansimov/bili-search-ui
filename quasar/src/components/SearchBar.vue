<template>
  <q-input
    rounded
    outlined
    clearable
    placeholder="Ask me anything ..."
    type="search"
    style="width: 680px"
    v-model="search"
    @update:model-value="debouncedSuggest"
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
    const search = ref('');
    let timeoutId = null;
    const SUGGEST_TRIGGER_INTERVAL = 250; // millisencods

    const debouncedSuggest = (newVal) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (newVal) {
          const query = newVal;
          try {
            console.log(`> Get suggestions for query: ${query}`);
            api.post('/suggest', { query: query }).then((response) => {
              console.log(response.data);
            });
          } catch (error) {
            console.error(error);
          }
        }
      }, SUGGEST_TRIGGER_INTERVAL);
    };
    return {
      search,
      debouncedSuggest,
    };
  },
};
</script>

<style lang="scss">
.q-focus-helper {
  visibility: hidden;
}
</style>
