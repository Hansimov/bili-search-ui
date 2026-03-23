<template>
  <div class="result-author-filters">
    <div class="result-author-filters__content">
      <span class="result-author-filters__label">
        <q-icon name="filter_alt" size="xs" class="q-ma-none" />
        只看作者 :
      </span>
      <div class="result-author-filter-chip">
        <div
          v-for="authorFilter in authorFilters"
          :key="authorFilter.mid"
          class="result-author-filter-chip__group"
        >
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
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Dict } from 'src/stores/resultStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { explore } from 'src/functions/explore';

const exploreStore = useExploreStore();
const authorFilters = computed(() => {
  return exploreStore.authorFilters;
});

function removeAuthorFilter(authorFilter: Dict) {
  exploreStore.removeAuthorFilter(authorFilter);
}

function searchAuthor(authorFilter: Dict) {
  explore({
    queryValue: `u="${authorFilter.name}"`,
    setQuery: true,
    setRoute: true,
  });
}
</script>

<style scoped>
.result-author-filters {
  width: 100%;
  padding: 2px 0 6px;
}

.result-author-filters__content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  max-width: var(--results-normal-fixed-width, 100%);
  margin: 0 auto;
  padding-left: 4px;
  box-sizing: border-box;
}

.result-author-filters__label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  line-height: 28px;
  white-space: nowrap;
}

.result-author-filter-chip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.result-author-filter-chip__group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
