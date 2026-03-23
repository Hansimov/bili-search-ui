<template>
  <div
    class="search-mode-empty-state"
    :class="[
      `search-mode-empty-state--${variant}`,
      {
        'search-mode-empty-state--with-help':
          showDirectQuickHelp && modeMeta.quickReference,
      },
    ]"
  >
    <div class="search-mode-empty-state__title-wrap">
      <div class="search-mode-empty-state__title" :style="titleStyleVars">
        <q-icon
          :name="modeMeta.icon"
          size="20px"
          class="search-mode-empty-state__icon"
        />
        <span>{{ modeMeta.label }}</span>
      </div>
    </div>

    <p class="search-mode-empty-state__subtitle">
      {{ modeMeta.subtitle }}
    </p>

    <DirectSearchQuickHelp
      v-if="showDirectQuickHelp && modeMeta.quickReference"
      :mode="mode"
      class="search-mode-empty-state__quick-help"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  getSearchMode,
  getSearchModeThemeVars,
  type SearchMode,
} from 'src/config/searchModes';
import DirectSearchQuickHelp from './DirectSearchQuickHelp.vue';

defineOptions({
  name: 'SearchModeEmptyState',
});

const props = withDefaults(
  defineProps<{
    mode: SearchMode;
    variant?: 'page' | 'panel';
    showDirectQuickHelp?: boolean;
  }>(),
  {
    variant: 'page',
    showDirectQuickHelp: false,
  }
);

const modeMeta = computed(() => getSearchMode(props.mode));
const titleStyleVars = computed(() => getSearchModeThemeVars(modeMeta.value));
</script>

<style scoped lang="scss">
.search-mode-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-align: center;
}

.search-mode-empty-state--page {
  min-height: min(48vh, 400px);
  justify-content: flex-start;
  padding-top: clamp(72px, 14vh, 132px);
}

.search-mode-empty-state--panel {
  min-height: min(42vh, 320px);
  justify-content: flex-start;
  padding: clamp(56px, 12vh, 104px) 12px 28px;
}

.search-mode-empty-state__title-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.search-mode-empty-state__title {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 12px 22px;
  border-radius: 999px;
  font-size: clamp(22px, 3.4vw, 30px);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--mode-light-color);
  background: var(--mode-light-background);
}

.search-mode-empty-state__icon {
  flex-shrink: 0;
  font-size: 26px;
}

.search-mode-empty-state__subtitle {
  max-width: min(720px, 92vw);
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.5;
}

.search-mode-empty-state__quick-help {
  margin-top: 18px;
}

@media (max-width: 640px) {
  .search-mode-empty-state--page {
    padding-top: clamp(56px, 11vh, 88px);
  }

  .search-mode-empty-state__title {
    gap: 10px;
    min-height: 52px;
    padding: 11px 18px;
    font-size: clamp(20px, 6vw, 26px);
  }

  .search-mode-empty-state__icon {
    font-size: 24px;
  }
}

body.body--light .search-mode-empty-state__subtitle {
  color: rgba(0, 0, 0, 0.62);
}

body.body--dark .search-mode-empty-state__title {
  color: var(--mode-dark-color);
  background: var(--mode-dark-background);
}

body.body--dark .search-mode-empty-state__subtitle {
  color: rgba(255, 255, 255, 0.62);
}
</style>
