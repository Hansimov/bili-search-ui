<template>
  <section
    v-if="quickReference"
    class="direct-search-quick-help"
    :style="themeVars"
  >
    <div class="direct-search-quick-help__header">
      <div class="direct-search-quick-help__title-wrap">
        <div class="direct-search-quick-help__badge">
          <q-icon :name="modeMeta.icon" size="18px" />
          <span>搜索语法速查</span>
        </div>
        <div class="direct-search-quick-help__title">
          {{ quickReference.title }}
        </div>
      </div>

      <div class="direct-search-quick-help__summary">
        <span
          v-for="item in modeMeta.helpSummary"
          :key="item"
          class="direct-search-quick-help__summary-item"
        >
          {{ item }}
        </span>
      </div>
    </div>

    <div class="direct-search-quick-help__body">
      <div class="direct-search-quick-help__format-card">
        <span class="direct-search-quick-help__format-label">格式</span>
        <code>{{ quickReference.format }}</code>
      </div>

      <div class="direct-search-quick-help__columns">
        <div
          v-for="column in quickReference.columns"
          :key="column.heading"
          class="direct-search-quick-help__column"
        >
          <div class="direct-search-quick-help__heading">
            {{ column.heading }}
          </div>
          <div
            v-for="row in column.rows"
            :key="`${column.heading}-${row.codes.join('-')}`"
            class="direct-search-quick-help__row"
          >
            <template v-for="code in row.codes" :key="code">
              <code>{{ code }}</code>
            </template>
            <span>{{ row.description }}</span>
          </div>
        </div>
      </div>

      <div class="direct-search-quick-help__examples">
        <span class="direct-search-quick-help__examples-label">示例</span>
        <template
          v-for="(example, index) in quickReference.examples"
          :key="example"
        >
          <span v-if="index > 0" class="direct-search-quick-help__separator"
            >·</span
          >
          <code>{{ example }}</code>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  getSearchMode,
  getSearchModeThemeVars,
  type SearchMode,
} from 'src/config/searchModes';

defineOptions({
  name: 'DirectSearchQuickHelp',
});

const props = withDefaults(
  defineProps<{
    mode?: SearchMode;
  }>(),
  {
    mode: 'direct',
  }
);

const modeMeta = computed(() => getSearchMode(props.mode));
const quickReference = computed(() => modeMeta.value.quickReference);
const themeVars = computed(() => getSearchModeThemeVars(modeMeta.value));
</script>

<style scoped lang="scss">
.direct-search-quick-help {
  width: 100%;
  max-width: 760px;
  margin-top: 0;
  padding: 18px 18px 16px;
  border: 1px solid var(--mode-light-border-color);
  border-radius: 20px;
  background: linear-gradient(
      180deg,
      var(--mode-light-soft-background),
      transparent 68%
    ),
    rgba(255, 255, 255, 0.72);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.direct-search-quick-help__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.direct-search-quick-help__title-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}

.direct-search-quick-help__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  color: var(--mode-light-color);
  background: var(--mode-light-background);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.direct-search-quick-help__title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  color: rgba(15, 23, 42, 0.88);
}

.direct-search-quick-help__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.direct-search-quick-help__summary-item {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.045);
  font-size: 12px;
  line-height: 1;
  color: rgba(15, 23, 42, 0.72);
}

.direct-search-quick-help__body {
  font-size: 13px;
  line-height: 1.65;
}

.direct-search-quick-help__format-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.direct-search-quick-help__format-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--mode-light-color);
}

.direct-search-quick-help__columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.direct-search-quick-help__column {
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.038);
  min-width: 0;
}

.direct-search-quick-help__heading {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--mode-light-color);
}

.direct-search-quick-help__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin: 4px 0;
  color: rgba(15, 23, 42, 0.76);
}

.direct-search-quick-help__examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-top: 2px;
}

.direct-search-quick-help__examples-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--mode-light-color);
}

.direct-search-quick-help__separator {
  opacity: 0.6;
}

.direct-search-quick-help__body code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
}

body.body--light .direct-search-quick-help__format-card,
body.body--light .direct-search-quick-help__column,
body.body--light .direct-search-quick-help__summary-item {
  border: 1px solid rgba(15, 23, 42, 0.05);
}

body.body--light .direct-search-quick-help__body code {
  background: rgba(0, 0, 0, 0.05);
  color: #c7254e;
}

body.body--dark .direct-search-quick-help {
  border-color: var(--mode-dark-border-color);
  background: linear-gradient(
      180deg,
      var(--mode-dark-soft-background),
      transparent 68%
    ),
    rgba(20, 20, 20, 0.9);
  box-shadow: none;
}

body.body--dark .direct-search-quick-help__badge {
  color: var(--mode-dark-color);
  background: var(--mode-dark-background);
}

body.body--dark .direct-search-quick-help__title {
  color: rgba(255, 255, 255, 0.9);
}

body.body--dark .direct-search-quick-help__summary-item,
body.body--dark .direct-search-quick-help__format-card,
body.body--dark .direct-search-quick-help__column {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

body.body--dark .direct-search-quick-help__format-label,
body.body--dark .direct-search-quick-help__heading,
body.body--dark .direct-search-quick-help__examples-label {
  color: var(--mode-dark-color);
}

body.body--dark .direct-search-quick-help__summary-item,
body.body--dark .direct-search-quick-help__row {
  color: rgba(255, 255, 255, 0.72);
}

body.body--dark .direct-search-quick-help__body code {
  background: rgba(255, 255, 255, 0.08);
  color: #e6db74;
}

@media (max-width: 720px) {
  .direct-search-quick-help {
    padding: 16px 14px 14px;
    border-radius: 18px;
  }

  .direct-search-quick-help__columns {
    grid-template-columns: 1fr;
  }
}
</style>
