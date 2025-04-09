<template>
  <q-drawer v-model="layoutStore.isSearchRecordsVisible" :width="drawerWidth">
    <q-scroll-area class="fit" side="left">
      <q-list>
        <q-item
          v-for="hit in searchStore.searchResultDict.hits.slice(0, 12)"
          :key="hit.bvid"
        >
          <q-item-section>
            {{ hit.title }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
    <div
      v-touch-pan.preserveCursor.prevent.mouse.horizontal="resizeDrawer"
      class="q-drawer__resizer"
    ></div>
  </q-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSearchStore } from 'src/stores/searchStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { TouchPanValue } from 'quasar';

const searchStore = useSearchStore();
const layoutStore = useLayoutStore();

const drawerWidth = computed(() => {
  return layoutStore.searchRecordsListWidth;
});
let initDrawerWidth: number;
const resizeDrawer: TouchPanValue = (evt) => {
  if (evt.isFirst) {
    initDrawerWidth = drawerWidth.value;
  }
  if (typeof evt.offset?.x === 'number') {
    layoutStore.updateDrawerWidth(initDrawerWidth + evt.offset.x);
  }
};
</script>

<style scoped>
.q-drawer__resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -2px;
  width: 4px;
  background-color: gray;
  cursor: ew-resize;
}
.q-drawer__resizer::after {
  content: '';
  position: absolute;
  top: 50%;
  height: 30px;
  left: -3px;
  right: -3px;
  transform: translateY(-50%);
  background-color: inherit;
  border-radius: 4px;
}
.q-drawer__resizer:hover {
  background-color: #aaa;
}
</style>
