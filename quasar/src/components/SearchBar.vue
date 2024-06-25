<template>
  <q-input v-model="search" filled type="search" hint="Search">
    <template v-slot:append>
      <q-icon name="search" />
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
