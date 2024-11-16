<template>
  <div class="ai-search-options-bar q-pb-xs q-pr-xs">
    <q-btn-group flat spread>
      <q-btn
        dense
        :label="$q.screen.gt.xs ? '自动纠错' : '纠错'"
        icon="fa-solid fa-check"
        class="auto-check-enabled"
        v-if="false"
        ><ButtonTooltip text="自动纠错" hidden
      /></q-btn>
      <q-btn
        dense
        :label="$q.screen.gt.xs ? '搜索历史' : '历史'"
        icon="fa-solid fa-list"
        v-if="false"
      >
        <ButtonTooltip text="搜索历史" hidden
      /></q-btn>
      <q-btn dense label="帮助" icon="fa-solid fa-question" v-if="false"
        ><ButtonTooltip text="帮助" hidden
      /></q-btn>
      <q-btn dense label="换一换" icon="fa-solid fa-refresh"
        ><ButtonTooltip text="换一换" hidden
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

<style lang="scss">
body.body--light {
  .auto-check-enabled {
    color: white !important;
    background-color: var(--main-bg-color-l);
  }
}
body.body--dark {
  .auto-check-enabled {
    color: white !important;
    background-color: var(--main-bg-color-d);
  }
}
</style>
