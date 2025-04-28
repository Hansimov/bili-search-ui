<template>
  <div class="row result-author-filters">
    <span>
      <q-icon name="o_filter_alt" size="xs" class="q-mr-xs" />
      <span>只看作者：</span>
      <q-chip
        v-for="authorFilter in authorFilters"
        :key="authorFilter.mid"
        outline
        dense
        removable
        @remove="removeAuthorFilter(authorFilter)"
      >
        {{ authorFilter.name }}
      </q-chip>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Dict } from 'src/stores/resultStore';
import { useExploreStore } from 'src/stores/exploreStore';

const exploreStore = useExploreStore();
const authorFilters = computed(() => {
  return exploreStore.authorFilters;
});

function removeAuthorFilter(authorFilter: Dict) {
  exploreStore.removeAuthorFilter(authorFilter);
}
</script>

<style scoped>
.result-author-filters {
  padding: 2px 0px 0px 4px;
}
</style>
