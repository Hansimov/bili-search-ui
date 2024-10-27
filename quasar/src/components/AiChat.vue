<template>
  <div class="ai-chat-messages-list">
    <div
      v-for="(message, index) in aiChatMessages"
      :key="index"
      class="ai-chat-message"
    >
      <div
        :class="message.role === 'user' ? 'user-content' : 'assistant-content'"
      >
        {{ message.content }}
      </div>
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

<style lang="scss">
.ai-chat-messages-list {
  width: var(--search-input-width);
  max-width: var(--search-input-max-width);
  word-wrap: break-word;
  overflow-x: hidden;
  overflow-y: scroll;
  max-height: min(300px, calc(100vh - 200px));
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
}

.ai-chat-message {
  padding-bottom: 4px;
}

.user-content,
.assistant-content {
  text-align: justify;
  text-justify: auto;
  white-space: pre-wrap;
  border-radius: 4px;
  padding-top: 4px;
  padding-bottom: 4px;
  padding-left: 5px;
  padding-right: 5px;
}

body.body--light {
  .user-content {
    color: #dd2288;
    background-color: #88888822;
    border: 1px solid #dddddd;
  }
  .assistant-content {
    color: #005599;
    background-color: #eeeeee22;
    border: 1px solid #dddddd;
  }
}

body.body--dark {
  .user-content {
    color: #ff66ee;
    background-color: #55555555;
    border: 1px solid #222222;
  }
  .assistant-content {
    color: #00aabb;
    background-color: #22222222;
    border: 1px solid #222222;
  }
}
</style>
