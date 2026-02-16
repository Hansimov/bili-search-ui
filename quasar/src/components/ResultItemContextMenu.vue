<!--
  ResultItemContextMenu - 搜索结果右键菜单

  提供右键操作：查看快照、在B站打开、复制BV号、复制链接。
  复制成功后在点击位置附近显示轻量提示，自动消失。
-->
<template>
  <q-menu
    ref="menuRef"
    touch-position
    context-menu
    class="result-context-menu"
    transition-show="jump-down"
    transition-hide="jump-up"
    @before-show="onMenuShow"
    @hide="onMenuHide"
  >
    <q-list dense class="context-menu-list">
      <q-item
        clickable
        v-close-popup
        class="context-menu-item"
        @click="$emit('view-snapshot')"
      >
        <q-item-section avatar class="context-menu-icon">
          <q-icon name="photo_library" size="18px" />
        </q-item-section>
        <q-item-section class="context-menu-label">查看快照</q-item-section>
      </q-item>

      <q-separator class="context-menu-sep" />

      <q-item
        clickable
        v-close-popup
        class="context-menu-item"
        @click="openInBilibili"
      >
        <q-item-section avatar class="context-menu-icon">
          <q-icon name="open_in_new" size="18px" />
        </q-item-section>
        <q-item-section class="context-menu-label">在B站打开</q-item-section>
      </q-item>

      <q-item
        clickable
        class="context-menu-item"
        :class="{ 'context-menu-item-success': copiedLink }"
        @click="doCopyLink"
      >
        <q-item-section avatar class="context-menu-icon">
          <q-icon :name="copiedLink ? 'check_circle' : 'link'" size="18px" />
        </q-item-section>
        <q-item-section class="context-menu-label">
          {{ copiedLink ? '已复制链接' : '复制链接' }}
        </q-item-section>
      </q-item>

      <q-item
        clickable
        class="context-menu-item"
        :class="{ 'context-menu-item-success': copiedBvid }"
        @click="doCopyBvid"
      >
        <q-item-section avatar class="context-menu-icon">
          <q-icon
            :name="copiedBvid ? 'check_circle' : 'content_copy'"
            size="18px"
          />
        </q-item-section>
        <q-item-section class="context-menu-label">
          {{ copiedBvid ? '已复制BV号' : '复制BV号' }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { copyToClipboard, QMenu } from 'quasar';

const props = defineProps<{
  bvid: string;
}>();

const emit = defineEmits<{
  'view-snapshot': [];
  'menu-open': [];
  'menu-close': [];
}>();

const menuRef = ref<InstanceType<typeof QMenu> | null>(null);
const copiedBvid = ref(false);
const copiedLink = ref(false);

const onMenuShow = () => {
  copiedBvid.value = false;
  copiedLink.value = false;
  emit('menu-open');
};

const onMenuHide = () => {
  emit('menu-close');
};

const openInBilibili = () => {
  window.open(`https://www.bilibili.com/video/${props.bvid}`, '_blank');
};

const doCopyBvid = () => {
  if (copiedBvid.value) return;
  copyToClipboard(props.bvid)
    .then(() => {
      copiedBvid.value = true;
      setTimeout(() => menuRef.value?.hide(), 1000);
    })
    .catch(() => menuRef.value?.hide());
};

const doCopyLink = () => {
  if (copiedLink.value) return;
  const url = `https://www.bilibili.com/video/${props.bvid}`;
  copyToClipboard(url)
    .then(() => {
      copiedLink.value = true;
      setTimeout(() => menuRef.value?.hide(), 1000);
    })
    .catch(() => menuRef.value?.hide());
};
</script>

<style>
/* Unscoped so QMenu portal picks it up */
.result-context-menu {
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25) !important;
}
.context-menu-list {
  min-width: 170px;
  padding: 4px 0 !important;
}
.context-menu-item {
  padding: 6px 14px !important;
  min-height: 36px !important;
}
.context-menu-item .context-menu-icon {
  min-width: 28px !important;
  padding-right: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}
.context-menu-label {
  font-size: 13px;
  padding-left: 6px !important;
}
.context-menu-sep {
  margin: 2px 10px !important;
}

/* Light theme */
body.body--light .result-context-menu .q-list {
  background: #ffffff;
}
body.body--light .context-menu-item:hover {
  background: #f0f4ff;
}
body.body--light .context-menu-icon .q-icon {
  color: #555;
}

/* Dark theme */
body.body--dark .result-context-menu .q-list {
  background: #2a2a3e;
}
body.body--dark .context-menu-item:hover {
  background: #363650;
}
body.body--dark .context-menu-icon .q-icon {
  color: #aaa;
}

/* Copied success feedback */
.context-menu-item-success {
  pointer-events: none;
}
.context-menu-item-success .context-menu-icon .q-icon {
  color: #4caf50 !important;
}
.context-menu-item-success .context-menu-label {
  color: #4caf50 !important;
}
</style>
