<template>
  <q-item class="suggest-author-item q-pr-xs">
    <q-item-section avatar side>
      <q-avatar class="suggest-author-avatar" @click="onAuthorClick">
        <img
          :src="cachedAvatarSrc"
          referrerpolicy="no-referrer"
          @error="onAvatarError"
        />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <div class="suggest-author-name" @click="onAuthorClick">
        {{ authorName }}
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import defaultAvatarUrl from 'src/assets/noface.jpg@96w_96h.avif';
import { explore } from 'src/functions/explore';
import { useCachedImage } from 'src/composables/useCachedImage';

const props = defineProps<{
  authorName: string;
  authorInfo: Record<string, unknown>;
}>();

const authorAvatarUrl = computed(
  () => (props.authorInfo.face as string) || defaultAvatarUrl
);

const { cachedSrc } = useCachedImage(() => authorAvatarUrl.value);

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
  const queryValue = `u=${props.authorName}`;
  explore({
    queryValue: queryValue,
    setQuery: true,
    setRoute: true,
  });
};
</script>

<style scoped>
.suggest-author-item {
  cursor: pointer;
  transition: transform 0.2s ease-out, filter 0.2s ease-out;
}
.suggest-author-item:hover {
  transform: scale(1.1);
  filter: contrast(1.25) saturate(1.1) brightness(1.05);
}
body.body--light .suggest-author-name {
  color: #404040;
}
body.body--dark .suggest-author-name {
  color: #d0d0d0;
}
.suggest-author-name {
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
