<template>
  <details
    v-if="isShowAuthorsList"
    ref="detailsElement"
    open
    class="result-authors-details q-pl-xs"
    :style="dynamicResultAuthorsDetailsStyle"
  >
    <summary @click.prevent="toggleDetails">相关作者</summary>
    <div ref="contentElement" class="authors-content-wrapper">
      <div class="result-authors-list">
        <ResultAuthorItem
          v-for="(authorItem, index) in authors"
          :key="index"
          :authorItem="authorItem"
        />
      </div>
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
    const contentElement = ref(null);
    const isOpen = ref(true);
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

    // Animated toggle for details expand/collapse
    const toggleDetails = () => {
      const details = detailsElement.value;
      const content = contentElement.value;
      if (!details || !content) return;

      if (isOpen.value) {
        // Collapse: animate max-height from scrollHeight to 0
        const height = content.scrollHeight;
        content.style.maxHeight = `${height}px`;
        // Force reflow so the browser sees the starting value
        content.offsetHeight; // eslint-disable-line no-unused-expressions
        content.style.maxHeight = '0px';
        const onEnd = () => {
          content.removeEventListener('transitionend', onEnd);
          details.removeAttribute('open');
          isOpen.value = false;
          layoutStore.setAuthorsListHeight(details.offsetHeight);
        };
        content.addEventListener('transitionend', onEnd, { once: true });
      } else {
        // Expand: open first, then animate max-height from 0 to scrollHeight
        details.setAttribute('open', '');
        isOpen.value = true;
        content.style.maxHeight = '0px';
        // Force reflow
        content.offsetHeight; // eslint-disable-line no-unused-expressions
        const targetHeight = content.scrollHeight;
        content.style.maxHeight = `${targetHeight}px`;
        const onEnd = () => {
          content.removeEventListener('transitionend', onEnd);
          // Remove inline max-height so content can reflow naturally
          content.style.maxHeight = '';
          layoutStore.setAuthorsListHeight(details.offsetHeight);
        };
        content.addEventListener('transitionend', onEnd, { once: true });
      }
    };

    onUnmounted(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      layoutStore.setAuthorsListHeight(0);
    });

    return {
      detailsElement,
      contentElement,
      authors,
      isShowAuthorsList,
      isOpen,
      toggleDetails,
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
.authors-content-wrapper {
  overflow: hidden;
  transition: max-height 0.25s ease;
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
