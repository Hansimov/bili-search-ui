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
  max-height: min(500px, calc(100vh - 300px));
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  transition: scroll 0.25s ease-in-out;
}

.ai-chat-message {
  padding-bottom: 4px;
}

.user-content {
  font-weight: bold;
}
.user-content::before {
  content: '❔ ';
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
  a[href^="https://www.bilibili.com/video"]::before
  {
    content: '📺 ';
    vertical-align: 8%;
  }
  a[href^="https://space.bilibili.com"]::before
  {
    content: '@';
    vertical-align: 3%;
  }
  code {
    font-family: 'consolas';
    padding: 2px;
    border-radius: 4px;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0 auto 0 auto;
    padding: 0 auto 0 auto;
    font-weight: bold;
    line-height: 1.25em;
  }
  h1 {
    font-size: 20px;
    line-height: 22px;
  }
  h1::before {
    content: '# ';
  }
  h2 {
    font-size: 18px;
    line-height: 20px;
  }
  h2::before {
    content: '## ';
  }
  h3 {
    font-size: 16px;
    line-height: 18px;
  }
  h3::before {
    content: '### ';
  }
  h4,
  h5,
  h6 {
    font-size: 14px;
  }
}

body.body--light {
  .user-content {
    color: var(--uc-color-l);
    background-color: var(--uc-bg-color-l);
    border: 1px solid var(--uc-bd-color-l);
  }
  .assistant-content {
    color: var(--ac-color-l);
    background-color: var(--ac-bg-color-l);
    border: 1px solid var(--ac-bd-color-l);
  }
  .assistant-content {
    a {
      color: var(--ac-link-color-l);
      border: 1px dashed var(--ac-link-bd-color-l);
    }
    a[href^="https://www.bilibili.com/video"]
    {
      color: var(--ac-video-link-color-l);
      border: 1px solid (--ac-video-link-bd-color-l);
    }
    a[href^="https://space.bilibili.com"]
    {
      color: var(--ac-user-link-color-l);
      border: none;
    }
    code {
      color: var(--ac-code-color-l);
      border: 1px dashed var(--ac-code-bd-color-l);
    }
  }
}

body.body--dark {
  .user-content {
    color: var(--uc-color-d);
    background-color: var(--uc-bg-color-d);
    border: 1px solid var(--uc-bd-color-d);
  }
  .assistant-content {
    color: var(--ac-color-d);
    background-color: var(--ac-bg-color-d);
    border: 1px solid var(--ac-bd-color-d);
  }
  .assistant-content {
    a {
      color: var(--ac-link-color-d);
      border: 1px solid var(--ac-link-bd-color-d);
    }
    a[href^="https://www.bilibili.com/video"]
    {
      color: var(--ac-video-link-color-d);
      border: 1px solid (--ac-video-link-bd-color-d);
    }
    a[href^="https://space.bilibili.com"]
    {
      color: var(--ac-user-link-color-d);
      // border: 1px dashed #eeeeee66;
      border: none;
    }
    code {
      color: var(--ac-code-color-d);
      border: 1px dashed var(--ac-code-bd-color-d);
    }
  }
}
</style>
