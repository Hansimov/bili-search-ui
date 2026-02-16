<template>
  <q-menu touch-position context-menu>
    <q-list dense style="min-width: 150px">
      <q-item clickable v-close-popup @click="$emit('view-snapshot')">
        <q-item-section side>
          <q-icon name="photo_library" size="xs" />
        </q-item-section>
        <q-item-section>查看截图</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="openInBilibili">
        <q-item-section side>
          <q-icon name="open_in_new" size="xs" />
        </q-item-section>
        <q-item-section>在B站打开</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="copyBvid">
        <q-item-section side>
          <q-icon name="content_copy" size="xs" />
        </q-item-section>
        <q-item-section>复制BV号</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';

const props = defineProps<{
  bvid: string;
}>();

defineEmits<{
  'view-snapshot': [];
}>();

const $q = useQuasar();

const openInBilibili = () => {
  window.open(`https://www.bilibili.com/video/${props.bvid}`, '_blank');
};

const copyBvid = () => {
  navigator.clipboard.writeText(props.bvid).then(() => {
    $q.notify({
      message: '已复制BV号',
      type: 'positive',
      position: 'top',
      timeout: 1500,
    });
  });
};
</script>
