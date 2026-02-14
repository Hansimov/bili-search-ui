<template>
  <details
    v-if="isShowAuthorsList"
    ref="detailsElement"
    open
    class="result-authors-details q-pl-xs"
    :style="dynamicResultAuthorsDetailsStyle"
  >
    <summary>相关作者</summary>
    <div class="result-authors-list">
      <ResultAuthorItem
        v-for="(authorItem, index) in authors"
        :key="index"
        :authorItem="authorItem"
      />
    </div>
  </details>
</template>

<script>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { isNonEmptyArray } from 'src/stores/resultStore';
import ResultAuthorItem from './ResultAuthorItem.vue';

export default {
  components: {
    ResultAuthorItem,
  },
  setup() {
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();
    const detailsElement = ref(null);
    let resizeObserver = null;

    const authors = computed(() => {
      // Backend now returns authors as a LIST (not dict) to preserve order
      // The list is already sorted by first_appear_order from backend
      const authorsList = exploreStore.latestAuthorsResult.output?.authors;
      return isNonEmptyArray(authorsList) ? authorsList : [];
    });
    const isShowAuthorsList = computed(() => {
      return isNonEmptyArray(authors.value);
    });

    // The backend sorts by first_appear_order to match video list order
    const dynamicResultAuthorsDetailsStyle = computed(() => {
      return {
        maxWidth: `${Math.min(layoutStore.availableContentWidth(), 1280)}px`,
      };
    });

    // Setup ResizeObserver helper
    const setupResizeObserver = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (detailsElement.value) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const height = entry.target.offsetHeight;
            layoutStore.setAuthorsListHeight(height);
          }
        });
        resizeObserver.observe(detailsElement.value);
        // Trigger initial height calculation
        layoutStore.setAuthorsListHeight(detailsElement.value.offsetHeight);
      } else {
        layoutStore.setAuthorsListHeight(0);
      }
    };

    // Watch for changes in isShowAuthorsList and detailsElement
    watch(
      [isShowAuthorsList, detailsElement],
      () => {
        // Use nextTick-like delay to ensure DOM is updated
        setTimeout(setupResizeObserver, 0);
      },
      { immediate: true }
    );

    onUnmounted(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      layoutStore.setAuthorsListHeight(0);
    });

    return {
      detailsElement,
      authors,
      isShowAuthorsList,
      dynamicResultAuthorsDetailsStyle,
    };
  },
};
</script>

<style lang="scss" scoped>
.result-authors-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, calc(var(--result-item-width)));
  overflow-y: scroll;
  overflow-x: hidden;
  max-height: 110px;
  /* CSS containment: isolate grid layout from ancestor reflows */
  contain: layout style;
  &::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
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
  padding-bottom: 6px;
  padding-left: 0px;
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
