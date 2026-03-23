<template>
  <section
    v-if="quickReference"
    class="direct-search-quick-help"
    :style="themeVars"
  >
    <div class="direct-search-quick-help__header">
      <div class="direct-search-quick-help__title-wrap">
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

      <div class="direct-search-quick-help__table-card">
        <div class="direct-search-quick-help__section-title">常用样例</div>
        <div class="direct-search-quick-help__table-wrap">
          <table class="direct-search-quick-help__table">
            <thead>
              <tr>
                <th>场景</th>
                <th>查询</th>
                <th>用途</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="example in quickReference.examples"
                :key="example.query"
              >
                <td>{{ example.group || '常用样例' }}</td>
                <td>
                  <code>{{ example.query }}</code>
                </td>
                <td>{{ example.summary }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="direct-search-quick-help__philosophy">
        <div class="direct-search-quick-help__section-title">设计哲学</div>
        <ul class="direct-search-quick-help__philosophy-list">
          <li
            v-for="item in quickReference.philosophy"
            :key="item"
            class="direct-search-quick-help__philosophy-item"
          >
            {{ item }}
          </li>
        </ul>
      </div>

      <div class="direct-search-quick-help__tables">
        <div
          v-for="table in quickReference.tables"
          :key="table.title"
          class="direct-search-quick-help__table-card"
        >
          <div class="direct-search-quick-help__section-title">
            {{ table.title }}
          </div>
          <div class="direct-search-quick-help__table-wrap">
            <table class="direct-search-quick-help__table">
              <thead>
                <tr>
                  <th v-for="column in table.columns" :key="column">
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in table.rows"
                  :key="`${table.title}-${row.join('-')}`"
                >
                  <td v-for="(cell, index) in row" :key="`${cell}-${index}`">
                    <code
                      v-if="
                        index === 0 || (table.columns.length > 2 && index === 1)
                      "
                    >
                      {{ cell }}
                    </code>
                    <template v-else>{{ cell }}</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  max-height: min(
    420px,
    calc(
      var(--viewport-height-css, 100vh) - var(--search-bar-total-height, 104px) -
        240px
    )
  );
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
  margin-bottom: 12px;
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
  min-height: 0;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.65;
  padding-right: 4px;
}

.direct-search-quick-help__body > * + * {
  margin-top: 14px;
}

.direct-search-quick-help__format-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
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

.direct-search-quick-help__section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--mode-light-color);
}

.direct-search-quick-help__philosophy {
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.038);
}

.direct-search-quick-help__philosophy-list {
  margin: 10px 0 0;
  padding-left: 18px;
}

.direct-search-quick-help__philosophy-item
  + .direct-search-quick-help__philosophy-item {
  margin-top: 6px;
}

.direct-search-quick-help__philosophy-item {
  color: rgba(15, 23, 42, 0.76);
}

.direct-search-quick-help__tables {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.direct-search-quick-help__table-card {
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.038);
}

.direct-search-quick-help__table-wrap {
  margin-top: 9px;
  overflow-x: auto;
}

.direct-search-quick-help__table {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    border: 1px solid rgba(128, 128, 128, 0.14);
  }

  th {
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  td {
    color: rgba(15, 23, 42, 0.76);
  }
}

.direct-search-quick-help__body code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

body.body--light .direct-search-quick-help__format-card,
body.body--light .direct-search-quick-help__philosophy,
body.body--light .direct-search-quick-help__table-card,
body.body--light .direct-search-quick-help__summary-item {
  border: 1px solid rgba(15, 23, 42, 0.05);
}

body.body--light .direct-search-quick-help__table th {
  background: rgba(15, 23, 42, 0.03);
}

body.body--light .direct-search-quick-help__body code {
  background: rgba(0, 0, 0, 0.05);
  color: #0f6f82;
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
body.body--dark .direct-search-quick-help__philosophy,
body.body--dark .direct-search-quick-help__table-card {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

body.body--dark .direct-search-quick-help__format-label,
body.body--dark .direct-search-quick-help__section-title {
  color: var(--mode-dark-color);
}

body.body--dark .direct-search-quick-help__summary-item,
body.body--dark .direct-search-quick-help__philosophy-item,
body.body--dark .direct-search-quick-help__table td {
  color: rgba(255, 255, 255, 0.72);
}

body.body--dark .direct-search-quick-help__table th {
  background: rgba(255, 255, 255, 0.03);
}

body.body--dark .direct-search-quick-help__body code {
  background: rgba(255, 255, 255, 0.08);
  color: #82d7e6;
}

@media (max-width: 720px) {
  .direct-search-quick-help {
    max-height: min(
      360px,
      calc(
        var(--viewport-height-css, 100vh) -
          var(--search-bar-total-height, 104px) - 208px
      )
    );
    padding: 16px 14px 14px;
    border-radius: 18px;
  }

  .direct-search-quick-help__table {
    min-width: 0;

    th,
    td {
      padding: 7px 8px;
    }
  }
}
</style>
