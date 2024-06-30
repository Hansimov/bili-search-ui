<template>
  <q-card flat class="result-item q-py-sm">
    <q-card-section class="result-cover q-pa-sm">
      <router-link :to="`/video/${result.bvid}`" target="_blank">
        <q-img
          :src="result.pic + coverPicSuffix"
          referrerpolicy="no-referrer"
          class="rounded-borders"
        />
      </router-link>
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <router-link :to="`/video/${result.bvid}`" target="_blank">
        <div class="result-title">{{ result.title }}</div>
      </router-link>
    </q-card-section>
    <q-item class="q-pa-sm result-bottom">
      <q-item-section class="result-owner-name">
        {{ result.owner.name }}
      </q-item-section>
      <q-item-section side class="result-pubdate">
        {{ result.pubdate_str.slice(0, 10) }}
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script>
import constants from '../stores/constants.json';

export default {
  props: {
    result: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      coverPicSuffix: constants.coverPicSuffix,
      userPicSuffix: constants.userPicSuffix,
    };
  },
};
</script>

<style scoped>
.result-item {
  background-color: transparent;
}

.result-owner-avatar,
.result-pubdate {
  flex: 0 0 auto;
}
.result-owner-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
.result-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: var(--result-title-font-size);
  line-height: var(--result-title-line-height);
  height: calc(2 * var(--result-title-line-height));
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
.result-title:hover {
  overflow: visible;
}
.q-card a {
  text-decoration: none;
  color: inherit;
}
.q-item {
  min-height: var(--result-title-line-height);
}
</style>
