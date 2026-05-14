<!--
  ResultItemContextMenu - 搜索结果右键菜单

  提供右键操作：查看快照、在B站打开、复制BV号、复制链接。
  复制成功后在点击位置附近显示轻量提示，自动消失。
-->
<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="result-context-menu-layer"
      @pointerdown="hide"
      @contextmenu.prevent="hide"
    >
      <q-list
        ref="menuEl"
        dense
        class="result-context-menu context-menu-list"
        :style="menuStyle"
        @pointerdown.stop
        @click.stop
        @contextmenu.prevent.stop
      >
        <q-item clickable class="context-menu-item" @click="viewSnapshot">
          <q-item-section avatar class="context-menu-icon">
            <q-icon name="photo_library" size="18px" />
          </q-item-section>
          <q-item-section class="context-menu-label">查看快照</q-item-section>
        </q-item>

        <q-separator class="context-menu-sep" />

        <q-item clickable class="context-menu-item" @click="openInBilibili">
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
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { copyToClipboard } from 'quasar';
import {
  getDocumentZoom,
  getViewportCssHeight,
  getViewportCssWidth,
  viewportPxToCssPx,
} from 'src/utils/zoom';

const props = defineProps<{
  bvid: string;
}>();

const emit = defineEmits<{
  'view-snapshot': [];
  'menu-open': [];
  'menu-close': [];
}>();

const visible = ref(false);
const menuEl = ref<HTMLElement | { $el?: HTMLElement } | null>(null);
const menuX = ref(0);
const menuY = ref(0);
const copiedBvid = ref(false);
const copiedLink = ref(false);

const MENU_MARGIN = 8;
const POINTER_OFFSET = 4;
const FALLBACK_MENU_WIDTH = 180;
const FALLBACK_MENU_HEIGHT = 168;

const menuStyle = computed(() => ({
  left: `${menuX.value}px`,
  top: `${menuY.value}px`,
}));

const getMenuElement = (): HTMLElement | null => {
  const raw = menuEl.value;
  if (!raw) return null;
  if (raw instanceof HTMLElement) return raw;
  return raw.$el || null;
};

const clampMenuPosition = (width = FALLBACK_MENU_WIDTH, height = FALLBACK_MENU_HEIGHT) => {
  const maxX = Math.max(MENU_MARGIN, getViewportCssWidth() - width - MENU_MARGIN);
  const maxY = Math.max(MENU_MARGIN, getViewportCssHeight() - height - MENU_MARGIN);
  menuX.value = Math.min(Math.max(MENU_MARGIN, menuX.value), maxX);
  menuY.value = Math.min(Math.max(MENU_MARGIN, menuY.value), maxY);
};

const open = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  copiedBvid.value = false;
  copiedLink.value = false;
  const zoom = getDocumentZoom();
  menuX.value = viewportPxToCssPx(event.clientX, zoom) + POINTER_OFFSET;
  menuY.value = viewportPxToCssPx(event.clientY, zoom) + POINTER_OFFSET;
  clampMenuPosition();
  visible.value = true;
  emit('menu-open');
  nextTick(() => {
    const element = getMenuElement();
    const width = element?.offsetWidth || FALLBACK_MENU_WIDTH;
    const height = element?.offsetHeight || FALLBACK_MENU_HEIGHT;
    clampMenuPosition(width, height);
  });
};

const hide = () => {
  if (!visible.value) return;
  visible.value = false;
  emit('menu-close');
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    hide();
  }
};

const viewSnapshot = () => {
  emit('view-snapshot');
  hide();
};

const openInBilibili = () => {
  window.open(`https://www.bilibili.com/video/${props.bvid}`, '_blank');
  hide();
};

const doCopyBvid = () => {
  if (copiedBvid.value) return;
  copyToClipboard(props.bvid)
    .then(() => {
      copiedBvid.value = true;
      setTimeout(() => hide(), 1000);
    })
    .catch(() => hide());
};

const doCopyLink = () => {
  if (copiedLink.value) return;
  const url = `https://www.bilibili.com/video/${props.bvid}`;
  copyToClipboard(url)
    .then(() => {
      copiedLink.value = true;
      setTimeout(() => hide(), 1000);
    })
    .catch(() => hide());
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});

defineExpose({ open, hide });
</script>

<style>
/* Unscoped because the menu is teleported to body. */
.result-context-menu-layer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: transparent;
}
.result-context-menu {
  position: fixed !important;
  background: #ffffff !important;
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
body.body--light .result-context-menu {
  background: #ffffff !important;
}
body.body--light .context-menu-item:hover {
  background: #f0f4ff;
}
body.body--light .context-menu-icon .q-icon {
  color: #555;
}

/* Dark theme */
body.body--dark .result-context-menu {
  background: #2a2a3e !important;
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
