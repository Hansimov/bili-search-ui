<template>
  <q-item class="suggest-author-item q-pt-sm q-pb-sm">
    <q-item-section avatar side>
      <q-avatar>
        <img
          :src="authorAvatarUrl"
          referrerpolicy="no-referrer"
          :style="{ filter: avatarFilter }"
        />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <div class="author-name">{{ authorName }}</div>
    </q-item-section>
  </q-item>
</template>

<script>
import constants from '../stores/constants.json';

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
      return this.authorInfo.face || constants.avatarDefault;
    },
    avatarFilter() {
      const hue = Math.random() * 360;
      return `contrast(0.8) brightness(1.1) saturate(1.2) hue-rotate(${hue}deg)`;
    },
  },
};
</script>

<style scoped>
.author-name {
  font-weight: bold;
}
.author-count {
  font-size: 0.9em;
  color: gray;
}
</style>
