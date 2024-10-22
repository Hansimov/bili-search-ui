<template>
  <q-item class="suggest-author-item q-pl-xs">
    <q-item-section avatar side>
      <q-avatar>
        <img :src="authorAvatarUrl" referrerpolicy="no-referrer" />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <div class="suggest-author-name">{{ authorName }}</div>
    </q-item-section>
  </q-item>
</template>

<script>
import defaultAvatarUrl from '../assets/noface.jpg@96w_96h.avif';

export default {
  props: {
    authorName: {
      type: String,
      required: true,
    },
    authorInfo: {
      type: Object,
      required: true,
    },
  },
  computed: {
    authorAvatarUrl() {
      return this.authorInfo.face || defaultAvatarUrl;
    },
  },
};
</script>

<style scoped>
.suggest-author-item {
  /* width: 150px; */
}
.suggest-author-name {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
