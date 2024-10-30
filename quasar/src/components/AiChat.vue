<template>
  <div ref="aiChatMessagesList" class="ai-chat-messages-list">
    <div
      v-for="(message, index) in aiChatMessages"
      :key="index"
      class="ai-chat-message"
    >
      <div v-if="message.role === 'user'" class="user-content">
        {{ message.content }}
      </div>
      <VueShowdown
        v-else
        class="assistant-content"
        :markdown="message.content"
        flavor="github"
        :options="{ openLinksInNewWindow: true }"
      />
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useAiChatStore } from 'src/stores/aiChatStore';
import { VueShowdown } from 'vue-showdown';

export default {
  components: {
    VueShowdown,
  },
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
  width: calc(var(--search-input-width) - var(--search-input-width-more));
  max-width: calc(
    var(--search-input-max-width) - var(--search-input-width-more)
  );
  word-wrap: break-word;
  overflow-x: hidden;
  overflow-y: scroll;
  max-height: min(600px, calc(100vh - 200px));
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  transition: scroll 0.25s ease-in-out;
}

.ai-chat-message {
  padding-bottom: 4px;
}

.user-content,
.assistant-content {
  text-align: start;
  white-space: pre-wrap;
  border-radius: 4px;
  padding-top: 4px;
  padding-bottom: 4px;
  padding-left: 5px;
  padding-right: 5px;
}

.assistant-content {
  ol,
  ul {
    margin: -2em auto -0.75em auto;
    padding: 0 auto 0 auto;
    line-height: 1em;
    padding-left: 2.5em;
  }
  li {
    margin: 0 auto -0.75em auto;
    padding: 0 auto 0 auto;
    line-height: 1.25em;
  }
  p {
    margin: 0 auto 0 auto;
    padding: 0 auto 0 auto;
  }
  a {
    color: inherit;
    text-decoration: none;
    padding: 3px;
    margin: 0em auto auto;
    border-radius: 6px;
    display: inline-block;
    vertical-align: middle;
  }
  code {
    font-family: 'consolas';
    padding: 2px;
    border-radius: 4px;
  }
}

body.body--light {
  .user-content {
    color: #dd2288;
    background-color: #77777722;
    border: 1px solid #dddddd;
  }
  .assistant-content {
    color: #222222;
    background-color: #eeeeee22;
    border: 1px solid #dddddd;
  }
  .assistant-content a {
    border: 1px solid #22222244;
    color: #228800;
  }
  .assistant-content code {
    border: 1px dashed #22222244;
    color: #dd5500;
  }
}

body.body--dark {
  .user-content {
    color: #ff66ee;
    background-color: #44444444;
    border: 1px solid #222222;
  }
  .assistant-content {
    color: #cccccc;
    background-color: #22222222;
    border: 1px solid #222222;
  }
  .assistant-content a {
    border: 1px solid #eeeeee66;
    color: #44cc00;
  }
  .assistant-content code {
    border: 1px dashed #eeeeee66;
    color: #ff8800;
  }
}
</style>
