<template>
  <q-item class="result-author-item q-pl-xs q-pb-none q-pt-xs">
    <q-item-section avatar side>
      <q-avatar class="result-author-avatar" @click="onAuthorClick">
        <img :src="authorAvatarUrl" referrerpolicy="no-referrer" />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <div class="result-author-name" @click="onAuthorClick">
        {{ authorItem.name }}
      </div>
    </q-item-section>
  </q-item>
</template>

<script lang="ts">
import defaultAvatarUrl from 'src/assets/noface.jpg@96w_96h.avif';
import type { Dict } from 'src/stores/resultStore';
import type { PropType } from 'vue';
import { useExploreStore } from 'src/stores/exploreStore';

export default {
  props: {
    authorItem: {
      type: Object as PropType<Dict>,
      required: true,
    },
  },
  computed: {
    authorAvatarUrl(): string {
      return this.authorItem.face || defaultAvatarUrl;
    },
  },
  setup(props) {
    const exploreStore = useExploreStore();
    const onAuthorClick = () => {
      exploreStore.setAuthorFilters([
        {
          mid: props.authorItem.mid,
          name: props.authorItem.name,
          type: 'author',
        },
      ]);
    };
    return {
      onAuthorClick,
    };
  },
};
</script>

<style scoped>
.result-author-item {
  max-width: var(--result-item-width);
  cursor: pointer;
  transition: transform 0.2s ease-out, filter 0.2s ease-out;
  transform-origin: left center;
}
.result-author-item:hover {
  transform: scale(1.1);
  filter: contrast(1.25) saturate(1.1) brightness(1.05);
}
body.body--light .result-author-name {
  color: #404040;
}
body.body--dark .result-author-name {
  color: #d0d0d0;
}
.result-author-name {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.q-item__section--avatar {
  margin: 0;
  padding-right: 6px;
  min-width: 0px;
}
</style>
