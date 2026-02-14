<template>
  <q-item
    class="result-author-item q-pl-xs q-pb-none q-pt-xs"
    @click="onAuthorClick"
    clickable
  >
    <q-item-section avatar side>
      <q-avatar class="result-author-avatar">
        <img
          :src="cachedAvatarSrc"
          referrerpolicy="no-referrer"
          @error="onAvatarError"
        />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <div class="result-author-name">
        {{ authorItem.name }}
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import defaultAvatarUrl from 'src/assets/noface.jpg@96w_96h.avif';
import type { Dict } from 'src/stores/resultStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useCachedImage } from 'src/composables/useCachedImage';

const props = defineProps<{
  authorItem: Dict;
}>();

const exploreStore = useExploreStore();

const authorAvatarUrl = computed(
  () => props.authorItem.face || defaultAvatarUrl
);

const { cachedSrc } = useCachedImage(() => authorAvatarUrl.value);

// Use cached version if available, otherwise original
const cachedAvatarSrc = computed(
  () => cachedSrc.value || authorAvatarUrl.value
);

const onAvatarError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  if (img.src !== defaultAvatarUrl) {
    img.src = defaultAvatarUrl;
  }
};

const onAuthorClick = () => {
  exploreStore.setAuthorFilters([
    {
      mid: props.authorItem.mid,
      name: props.authorItem.name,
      type: 'author',
    },
  ]);
};
</script>

<style>
.q-focus-helper {
  visibility: hidden;
}
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
