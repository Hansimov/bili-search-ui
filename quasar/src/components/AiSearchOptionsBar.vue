<template>
  <div class="ai-search-options-bar q-pb-xs q-pr-xs">
    <q-btn-group flat spread>
      <q-btn dense label="新建" icon="fa-solid fa-plus" @click="newChat"
        ><ButtonTooltip text="新建对话" hidden
      /></q-btn>
      <q-btn
        dense
        label="中止"
        icon="o_stop_circle"
        @click="terminateGeneration"
        ><ButtonTooltip text="中止" hidden
      /></q-btn>
      <q-btn dense label="重答" icon="fa-solid fa-rotate-right"
        ><ButtonTooltip text="重新生成" hidden />
      </q-btn>
      <q-btn dense label="对话记录" icon="fa-solid fa-list" v-if="false">
        <ButtonTooltip text="对话记录" hidden />
      </q-btn>
      <q-btn
        dense
        label="发送"
        icon="fa-regular fa-paper-plane"
        @click="sendAiQuery"
      >
        <ButtonTooltip text="发送" hidden />
      </q-btn>
    </q-btn-group>
  </div>
</template>

<script>
import ButtonTooltip from './ButtonTooltip.vue';
import { terminateGeneration, submitAiQuery } from '../functions/ai';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import { useAiChatStore } from 'src/stores/aiChatStore';

export default {
  components: {
    ButtonTooltip,
  },
  setup() {
    const searchStore = useSearchStore();
    const aiChatStore = useAiChatStore();
    const router = useRouter();

    const sendAiQuery = () => {
      submitAiQuery(searchStore.aiQuery, router);
    };
    const newChat = () => {
      aiChatStore.saveAndClearAiChatMessages();
    };

    return {
      terminateGeneration,
      sendAiQuery,
      newChat,
    };
  },
};
</script>

<style lang="scss">
.ai-search-options-bar {
  width: calc(var(--search-input-width) - var(--search-input-width-more));
  max-width: calc(
    var(--search-input-max-width) - var(--search-input-width-more)
  );
  padding-top: 2px;
  padding-bottom: 2px;
}
.ai-search-options-bar .q-btn__content {
  transition: transform 0.2s ease-out;
  .material-icons-outlined {
    transform: scale(1.25);
  }
  i {
    font-size: 1.1em;
  }
}
.ai-search-options-bar .q-btn__content:hover {
  transform: scale(1.1);
}
body.body--light {
  .ai-search-options-bar button {
    color: var(--options-btn-color-l);
  }
}
body.body--dark {
  .ai-search-options-bar button {
    color: var(--options-btn-color-d);
  }
}
</style>
