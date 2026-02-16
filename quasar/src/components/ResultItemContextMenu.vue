<!--
  ResultItemContextMenu - 搜索结果右键菜单

  提供右键操作：查看快照、在B站打开、复制BV号、复制链接。
  复制成功后在点击位置附近显示轻量提示，自动消失。
-->
<template>
  <q-menu
    touch-position
    context-menu
    class="result-context-menu"
    transition-show="jump-down"
    transition-hide="jump-up"
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
        v-close-popup
        class="context-menu-item"
        @click="doCopyLink"
      >
        <q-item-section avatar class="context-menu-icon">
          <q-icon name="link" size="18px" />
        </q-item-section>
        <q-item-section class="context-menu-label">复制链接</q-item-section>
      </q-item>

      <q-item
        clickable
        v-close-popup
        class="context-menu-item"
        @click="doCopyBvid"
      >
        <q-item-section avatar class="context-menu-icon">
          <q-icon name="content_copy" size="18px" />
        </q-item-section>
        <q-item-section class="context-menu-label">复制BV号</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { copyToClipboard } from 'quasar';
import { showCopyToast } from 'src/services/videoshotService';

const props = defineProps<{
  bvid: string;
}>();

defineEmits<{
  'view-snapshot': [];
}>();

const openInBilibili = () => {
  window.open(`https://www.bilibili.com/video/${props.bvid}`, '_blank');
};

const doCopyBvid = (e: Event) => {
  const mouseEvt = e as MouseEvent;
  copyToClipboard(props.bvid)
    .then(() => showCopyToast('已复制BV号', mouseEvt))
    .catch(() => showCopyToast('复制失败', mouseEvt, true));
};

const doCopyLink = (e: Event) => {
  const mouseEvt = e as MouseEvent;
  const url = `https://www.bilibili.com/video/${props.bvid}`;
  copyToClipboard(url)
    .then(() => showCopyToast('已复制链接', mouseEvt))
    .catch(() => showCopyToast('复制失败', mouseEvt, true));
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
</style>
