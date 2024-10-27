<template>
  <div class="ai-chat-container">
    <div
      v-for="(message, index) in aiChatMessages"
      :key="index"
      class="ai-chat-message"
    >
      {{ message.role }} : {{ message.content }}
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useAiChatStore } from 'src/stores/aiChatStore';

export default {
  setup() {
    const aiChatStore = useAiChatStore();
    const aiChatMessages = computed(() => aiChatStore.aiChatMessages);

    return {
      aiChatMessages,
    };
  },
};
</script>
