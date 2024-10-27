<template>
  <div ref="aiChatMessagesList" class="ai-chat-messages-list">
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useAiChatStore } from 'src/stores/aiChatStore';

export default {
  setup() {
    const aiChatStore = useAiChatStore();
    const aiChatMessages = computed(() => aiChatStore.aiChatMessages);
    const aiChatMessagesList = ref(null);

    const onWheel = (event) => {
      if (event.deltaY !== 0) {
        const list = aiChatMessagesList.value;
        if (list.scrollTop + list.clientHeight < list.scrollHeight - 10) {
          aiChatStore.setIsUserScrollAiChat(true);
        }
      }
    };

    const onScroll = (event) => {
      if (event.deltaY !== 0) {
        const list = aiChatMessagesList.value;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 10) {
          aiChatStore.setIsUserScrollAiChat(false);
        }
      }
    };

    onMounted(() => {
      if (aiChatMessagesList.value) {
        aiChatMessagesList.value.addEventListener('scroll', onScroll);
        aiChatMessagesList.value.addEventListener('wheel', onWheel);
        aiChatStore.setAiChatMessagesListRef(aiChatMessagesList.value);
      }
    });

    onBeforeUnmount(() => {
      if (aiChatMessagesList.value) {
        aiChatMessagesList.value?.removeEventListener('scroll', onScroll);
        aiChatMessagesList.value?.removeEventListener('wheel', onWheel);
        aiChatStore.setAiChatMessagesListRef(null);
      }
    });
    return {
      aiChatMessages,
      aiChatMessagesList,
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
  max-height: min(200px, calc(100vh - 200px));
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  scroll-behavior: smooth;
  transition: scroll 0.25s ease-in-out;
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
