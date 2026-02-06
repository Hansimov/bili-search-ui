<template>
  <q-toolbar>
    <!-- 移动端：汉堡菜单按钮（桌面端侧边栏已处理） -->
    <q-btn
      v-if="!isDesktop"
      flat
      round
      dense
      icon="menu"
      @click="toggleMobileMenu"
    />
    <q-space />
    <router-link to="/">
      <q-toolbar-title>blbl.top</q-toolbar-title>
    </router-link>
    <q-space />
    <!-- 移动端：保留快捷登录入口 -->
    <login-button v-if="!isDesktop" />
  </q-toolbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import LoginButton from 'components/LoginButton.vue';

const layoutStore = useLayoutStore();
const isDesktop = computed(() => layoutStore.isDesktopMode());

const toggleMobileMenu = () => {
  layoutStore.toggleMobileSidebar();
};
</script>

<style lang="scss">
.q-toolbar .q-focus-helper {
  visibility: hidden;
}
.q-toolbar a {
  text-decoration: none;
  color: inherit;
}
</style>
