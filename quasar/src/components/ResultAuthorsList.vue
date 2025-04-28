<template>
  <details open class="result-authors-details q-pl-xs">
    <summary>相关作者</summary>
    <q-list class="result-authors-list" v-if="isShowAuthorsList">
      <ResultAuthorItem
        v-for="(authorItem, index) in authors"
        :key="index"
        :authorItem="authorItem"
      />
    </q-list>
  </details>
</template>

<script>
import { computed, watch } from 'vue';
import { useExploreStore } from 'src/stores/exploreStore';
import { isNonEmptyArray, isNonEmptyDict } from 'src/stores/resultStore';
import ResultAuthorItem from './ResultAuthorItem.vue';

export default {
  components: {
    ResultAuthorItem,
  },
  setup() {
    const exploreStore = useExploreStore();
    const authors = computed(() => {
      const authorsDict = exploreStore.latestAuthorsResult.output?.authors;
      return isNonEmptyDict(authorsDict) ? Object.values(authorsDict) : [];
    });
    const isShowAuthorsList = computed(() => {
      return isNonEmptyArray(authors.value);
    });
    function sortAuthors() {
      const sort_field = 'total_sort_score';
      const sort_order = 'desc';
      authors.value.sort((a, b) => {
        const valueA = a[sort_field];
        const valueB = b[sort_field];
        if (sort_order === 'asc') {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });
    }
    watch(authors, () => {
      sortAuthors();
    });
    return {
      authors,
      isShowAuthorsList,
    };
  },
};
</script>

<style lang="scss" scoped>
.result-authors-list {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  overflow: hidden;
}
.result-authors-list > * {
  overflow: hidden;
}
@media (max-width: 520px) {
  .result-authors-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: auto;
  }
}
.result-authors-details {
  padding-top: 10px;
}
details {
  cursor: pointer;
  margin: 0;
  line-height: 1.75;
}
summary {
  user-select: none;
}
body.body--light summary:hover {
  background-color: #eeeeee;
}
body.body--dark summary:hover {
  background-color: #333333;
}
details > summary::before {
  content: '▶️ ';
  filter: grayscale(100%) contrast(2);
}
details[open] > summary::before {
  content: '🔽 ';
  filter: grayscale(100%) contrast(2);
}
</style>
