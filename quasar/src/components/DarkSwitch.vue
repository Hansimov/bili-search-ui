<template>
  <q-toggle
    color="black"
    v-model="isDark"
    :icon="isDark ? 'bedtime' : 'wb_sunny'"
    @update:model-value="toggleDarkMode"
  />
</template>

<script>
import { ref } from 'vue';
import { Dark } from 'quasar';

export default {
  setup() {
    const isDark = ref(Dark.isActive);
    const toggleDarkMode = (newValue) => {
      isDark.value = newValue;
      Dark.set(newValue);
    };

    return {
      isDark,
      toggleDarkMode,
    };
  },
};
</script>
