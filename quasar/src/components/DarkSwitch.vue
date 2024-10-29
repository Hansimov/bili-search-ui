<template>
  <q-toggle
    color="black"
    v-model="isDark"
    :icon="isDark ? 'bedtime' : 'wb_sunny'"
  />
</template>

<script>
import { ref, computed } from 'vue';
import { Dark } from 'quasar';

export default {
  setup() {
    const isDarkRef = ref(JSON.parse(localStorage.getItem('isDark') || 'true'));
    Dark.set(isDarkRef.value);

    const isDark = computed({
      get: () => isDarkRef.value,
      set: (newValue) => {
        isDarkRef.value = newValue;
        Dark.set(newValue);
        localStorage.setItem('isDark', JSON.stringify(newValue));
      },
    });

    return {
      isDark,
    };
  },
};
</script>
