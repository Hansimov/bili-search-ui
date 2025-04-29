<template>
  <div class="row result-author-filters">
    <span>
      <span>
        <q-icon name="o_filter_alt" size="xs" class="q-ma-none" />
        只看作者 :
      </span>
      <span class="result-author-filter-chip">
        <span v-for="authorFilter in authorFilters" :key="authorFilter.mid">
          <q-chip
            outline
            dense
            removable
            @remove="removeAuthorFilter(authorFilter)"
          >
            {{ authorFilter.name }}
          </q-chip>
          <q-chip clickable dense @click="searchAuthor(authorFilter)">
            查看Ta的全部视频
          </q-chip>
        </span>
      </span>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Dict } from 'src/stores/resultStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { explore } from 'src/functions/explore';

const exploreStore = useExploreStore();
const authorFilters = computed(() => {
  return exploreStore.authorFilters;
});
const router = useRouter();

function removeAuthorFilter(authorFilter: Dict) {
  exploreStore.removeAuthorFilter(authorFilter);
}

function searchAuthor(authorFilter: Dict) {
  explore({
    queryValue: `u="${authorFilter.name}"`,
    router: router,
    isFromURL: true,
  });
}
</script>

<style scoped>
.result-author-filter-chip {
  vertical-align: 1px;
  margin: 0px;
}
.result-author-filters {
  padding: 2px 0px 0px 4px;
}
</style>
