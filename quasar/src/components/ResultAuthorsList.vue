<template>
  <details
    v-if="isShowAuthorsList"
    ref="detailsElement"
    open
    class="result-authors-details"
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
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
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
    let animationCleanup = null; // cleanup function for in-progress animation
    let measureRAFId = null;

    const authors = computed(() => {
      // Backend now returns authors as a LIST (not dict) to preserve order
      // The list is already sorted by first_appear_order from backend
      const authorsList = exploreStore.latestAuthorsResult.output?.authors;
      return isNonEmptyArray(authorsList) ? authorsList : [];
    });
    const isShowAuthorsList = computed(() => {
      return isNonEmptyArray(authors.value);
    });

    const syncExpandedMaxHeight = () => {
      const content = contentElement.value;
      if (!content || !isOpen.value) return;
      if (measureRAFId != null) {
        cancelAnimationFrame(measureRAFId);
      }
      measureRAFId = requestAnimationFrame(() => {
        measureRAFId = null;
        if (!contentElement.value || !isOpen.value) return;
        contentElement.value.style.maxHeight = `${contentElement.value.scrollHeight}px`;
      });
    };

    const handleWindowResize = () => {
      syncExpandedMaxHeight();
    };

    // Watch for changes in isShowAuthorsList and detailsElement
    watch(
      [isShowAuthorsList, detailsElement],
      async () => {
        await nextTick();
        syncExpandedMaxHeight();
      },
      { immediate: true }
    );

    watch(
      () => layoutStore.screenWidth,
      () => {
        syncExpandedMaxHeight();
      }
    );

    // Animated toggle for details expand/collapse
    const toggleDetails = () => {
      const details = detailsElement.value;
      const content = contentElement.value;
      if (!details || !content) return;

      // Cancel any in-progress animation
      if (animationCleanup) {
        animationCleanup();
        animationCleanup = null;
      }

      // Helper: attach transitionend with a safety timeout fallback
      const onTransitionEnd = (el, callback, timeoutMs = 350) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          el.removeEventListener('transitionend', handler);
          clearTimeout(timer);
          callback();
        };
        const handler = (e) => {
          if (e.target === el) finish();
        };
        el.addEventListener('transitionend', handler);
        const timer = setTimeout(finish, timeoutMs);
        // Return cleanup that skips the callback
        return () => {
          if (!done) {
            done = true;
            el.removeEventListener('transitionend', handler);
            clearTimeout(timer);
          }
        };
      };

      if (isOpen.value) {
        // Collapse: animate max-height from scrollHeight to 0
        const height = content.scrollHeight;
        content.style.transition = 'none';
        content.style.maxHeight = `${height}px`;
        // Force reflow so browser registers the starting value
        void content.offsetHeight; // eslint-disable-line no-unused-expressions
        content.style.transition = '';
        // Use rAF to ensure the starting value is painted before animating
        requestAnimationFrame(() => {
          content.style.maxHeight = '0px';
          animationCleanup = onTransitionEnd(content, () => {
            animationCleanup = null;
            details.removeAttribute('open');
            isOpen.value = false;
          });
        });
      } else {
        // Expand: open first, then animate max-height from 0 to scrollHeight
        details.setAttribute('open', '');
        isOpen.value = true;
        content.style.transition = 'none';
        content.style.maxHeight = '0px';
        void content.offsetHeight; // eslint-disable-line no-unused-expressions
        content.style.transition = '';
        const targetHeight = content.scrollHeight;
        requestAnimationFrame(() => {
          content.style.maxHeight = `${targetHeight}px`;
          animationCleanup = onTransitionEnd(content, () => {
            animationCleanup = null;
            content.style.maxHeight = `${content.scrollHeight}px`;
          });
        });
      }
    };

    window.addEventListener('resize', handleWindowResize, { passive: true });

    onUnmounted(() => {
      window.removeEventListener('resize', handleWindowResize);
      if (measureRAFId != null) {
        cancelAnimationFrame(measureRAFId);
        measureRAFId = null;
      }
      if (animationCleanup) {
        animationCleanup();
        animationCleanup = null;
      }
    });

    return {
      detailsElement,
      contentElement,
      authors,
      isShowAuthorsList,
      isOpen,
      toggleDetails,
    };
  },
};
</script>

<style lang="scss" scoped>
.result-authors-list {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(var(--result-item-width), 100%), 1fr)
  );
  overflow-y: scroll;
  overflow-x: hidden;
  max-height: 96px;
  width: 100%;
  justify-content: start;
  align-content: start;
  column-gap: 8px;
  row-gap: 3px;
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
@media (max-width: 569px) {
  .result-authors-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.authors-content-wrapper {
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.result-authors-details {
  padding-bottom: 6px;
  padding-left: 0px;
  width: 100%;
  max-width: 100%;
}
details {
  cursor: pointer;
  margin: 0;
  line-height: 1.7;
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
