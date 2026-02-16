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
        :options="{
          openLinksInNewWindow: true,
          literalMidWordUnderscores: true,
          tables: true,
        }"
        :extensions="[replaceHtmlTags]"
      />
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useAiChatStore } from 'src/stores/aiChatStore';
import { VueShowdown } from 'vue-showdown';
import { replaceHtmlTags } from 'src/utils/html';

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
        aiChatMessagesList.value.addEventListener('scroll', onScroll, {
          passive: true,
        });
        aiChatMessagesList.value.addEventListener('wheel', onWheel, {
          passive: true,
        });
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
      replaceHtmlTags,
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
  border-radius: 4px;
  padding-top: 4px;
  padding-bottom: 4px;
  padding-left: 5px;
  padding-right: 5px;
}

.assistant-content {
  * {
    white-space-collapse: collapse;
    margin: 0 auto 0 auto;
    padding: 0 auto 0 auto;
    line-height: 1.75em;
  }
  brx {
    display: block;
    height: 0.75em;
  }
  ol,
  ul {
    display: block;
    padding-left: 2em;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  a[href^="https://www.bilibili.com/video"]
  {
    display: inline-block;
    padding: 0px 4px 0px 4px;
    margin: 1px 0px 1px 2px;
    border-radius: 6px;
  }
  a[href^="https://www.bilibili.com/video"]::before
  {
    content: '📺 ';
  }
  a[href^="https://space.bilibili.com"]::before
  {
    content: '@';
  }
  code {
    font-family: 'consolas';
    padding: 1px 2px 1px 2px;
    border-radius: 4px;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: bold;
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
  table,
  th,
  td {
    border: 1px solid #888888;
    border-collapse: collapse;
    padding: 1px 2px 1px 2px;
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
