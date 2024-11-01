<template>
  <div class="ai-search-options-bar q-pb-xs q-pr-xs">
    <q-btn-group flat spread>
      <q-btn dense xlabel="new" icon="fa-solid fa-plus"
        ><ButtonTooltip text="新建对话"
      /></q-btn>
      <q-btn dense xlabel="stop" icon="o_stop_circle"
        ><ButtonTooltip text="中止"
      /></q-btn>
      <q-btn dense xlabel="regenerate" icon="fa-solid fa-random"
        ><ButtonTooltip text="重新生成" />
      </q-btn>
      <q-btn dense xlabel="history" icon="fa-solid fa-list" v-if="false">
        <ButtonTooltip text="历史记录" />
      </q-btn>
      <q-btn dense xlabel="send" icon="fa-solid fa-paper-plane">
        <ButtonTooltip text="发送"
      /></q-btn>
    </q-btn-group>
  </div>
</template>

<script>
import ButtonTooltip from './ButtonTooltip.vue';

export default {
  components: {
    ButtonTooltip,
  },
};
</script>

<style lang="scss">
.ai-search-options-bar {
  width: calc(var(--search-input-width) - var(--search-input-width-more));
  max-width: calc(
    var(--search-input-max-width) - var(--search-input-width-more)
  );
}
.ai-search-options-bar .q-btn__content {
  transition: transform 0.2s ease-in-out;
  .material-icons-outlined {
    transform: scale(1.25);
  }
  i {
    font-size: 1em;
  }
}
.ai-search-options-bar .q-btn__content:hover {
  transform: scale(1.5);
  color: var(--btn-hover-color-d);
}
body.body--light {
  .ai-search-options-bar .q-btn__content:hover {
    color: var(--btn-hover-color-l);
  }
}
body.body--dark {
  .ai-search-options-bar .q-btn__content:hover {
    color: var(--btn-hover-color-d);
  }
}
</style>
