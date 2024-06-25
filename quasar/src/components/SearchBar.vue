<template>
  <q-input
    rounded
    outlined
    clearable
    placeholder="Search"
    v-model="search"
    type="search"
    style="width: 680px"
  >
    <template v-slot:prepend>
      <q-btn unelevated padding="xs"><q-icon name="search" /></q-btn>
    </template>
    <template v-slot:append>
      <q-btn unelevated padding="xs"><q-icon name="image" /></q-btn>
    </template>
  </q-input>
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    return {
      search: ref(''),
    };
  },
};
</script>

<style lang="scss">
.q-focus-helper {
  visibility: hidden;
}
</style>
