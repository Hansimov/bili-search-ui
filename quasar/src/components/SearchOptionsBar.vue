<template>
  <div class="ai-search-options-bar q-pb-xs q-pr-xs">
    <q-btn-group flat spread>
      <q-btn dense label="禁用自动纠错" icon="fa-solid fa-check"
        ><ButtonTooltip text="禁用自动纠错" hidden
      /></q-btn>
      <q-btn dense label="搜索历史" icon="fa-solid fa-list">
        <ButtonTooltip text="搜索历史" hidden
      /></q-btn>
      <q-btn dense label="帮助" icon="fa-solid fa-question"
        ><ButtonTooltip text="帮助" hidden
      /></q-btn>
      <q-btn dense label="搜索" icon="fa-regular fa-paper-plane">
        <ButtonTooltip text="搜索" hidden
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

<style lang="scss"></style>
