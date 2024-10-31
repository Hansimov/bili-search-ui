<template>
  <div class="ai-search-options-bar q-pb-xs q-pr-xs">
    <q-btn-group flat spread>
      <q-btn dense xlabel="rewrite" icon="fa-solid fa-quote-right"
        ><ButtonTooltip text="禁用自动纠错"
      /></q-btn>
      <q-btn dense xlabel="search-history" icon="fa-solid fa-list">
        <ButtonTooltip text="历史记录"
      /></q-btn>
      <q-btn dense xlabel="help" icon="fa-solid fa-question"
        ><ButtonTooltip text="帮助"
      /></q-btn>
      <q-btn dense xlabel="submit" icon="fa-solid fa-paper-plane">
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
  color: coral;
}
</style>
