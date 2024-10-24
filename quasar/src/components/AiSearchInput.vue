<template>
  <div class="ai-search-input q-pa-none">
    <q-input
      rounded
      outlined
      :dense="$route.path !== '/'"
      :class="{
        'q-pa-none': $route.path === '/',
        'q-pb-sm': $route.path !== '/',
      }"
      :placeholder="aiSearchInputPlaceholder"
      type="search"
      v-model="aiQuery"
      @update:model-value="handleAiSearchInput"
      @keyup.enter="submitAiQueryInInput(false)"
      color="teal-5"
    >
      <template v-slot:prepend>
        <q-btn unelevated class="q-px-xs">
          <q-icon name="bolt" />
        </q-btn>
      </template>
      <template v-slot:append>
        <AiSearchToggle />
      </template>
    </q-input>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import AiSearchToggle from './AiSearchToggle.vue';
import { submitAiQuery } from '../functions/ai';

export default {
  components: {
    AiSearchToggle,
  },
  setup() {
    const searchStore = useSearchStore();
    const aiQuery = ref(searchStore.aiQuery || '');
    const router = useRouter();

    const handleAiSearchInput = (value) => {
      console.log('aiSearchInput:', value);
      // Add logic to process natural language input here
    };

    const submitAiQueryInInput = async (isFromURL = false) => {
      await submitAiQuery(aiQuery.value, router, isFromURL);
    };

    const aiSearchInputPlaceholder = computed(() => {
      return '试着问点什么吧……';
    });

    return {
      aiQuery,
      handleAiSearchInput,
      submitAiQueryInInput,
      aiSearchInputPlaceholder,
    };
  },
};
</script>

<style lang="scss">
.ai-search-input {
  width: var(--search-input-width);
  max-width: var(--search-input-max-width);
}
.ai-search-input .q-focus-helper {
  visibility: hidden;
}
</style>
