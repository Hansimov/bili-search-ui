<template>
  <div class="ai-search-input q-pa-none">
    <q-input
      rounded
      outlined
      :dense="$route.path !== '/'"
      :placeholder="aiSearchInputPlaceholder"
      type="search"
      v-model="aiQuery"
      @update:model-value="aiSuggest"
      @keyup.enter="submitAiQueryInInput(false)"
      color="teal-5"
    >
      <template v-slot:prepend>
        <q-btn unelevated class="q-px-none">
          <q-icon name="o_circle" color="teal-5" size="10px" />
          <q-icon name="circle" color="teal-5" size="14px" />
        </q-btn>
      </template>
    </q-input>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import { aiSuggest, submitAiQuery } from '../functions/ai';

export default {
  setup() {
    const searchStore = useSearchStore();
    const aiQuery = ref(searchStore.aiQuery || '');
    const router = useRouter();

    const submitAiQueryInInput = async (isFromURL = false) => {
      await submitAiQuery(aiQuery.value, router, isFromURL);
    };

    const aiSearchInputPlaceholder = computed(() => {
      return '试着问点什么吧……';
    });

    return {
      aiQuery,
      aiSuggest,
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

@keyframes ai-icon-frs-l {
  0% {
    transform: scale(1.1);
  }
  50% {
    transform: scale(0.75);
  }
  100% {
    transform: scale(1.1);
  }
}
@keyframes ai-icon-frs-r {
  0% {
    transform: scale(0.75);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(0.75);
  }
}
.ai-icon-ani-l {
  animation: ai-icon-frs-l 2s infinite;
  filter: hue-rotate(0deg);
  transform: translateY(1px);
}
.ai-icon-ani-r {
  animation: ai-icon-frs-r 2s infinite;
  // filter: hue-rotate(200deg);
}
</style>
