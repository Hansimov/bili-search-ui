<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dsl-help-card" :style="themeVars">
      <q-toolbar class="dsl-help-toolbar">
        <q-icon
          :name="modeMeta.icon"
          size="20px"
          class="q-mr-sm"
          style="opacity: 0.6"
        />
        <q-toolbar-title class="dsl-help-title">
          {{ detailedHelp?.title }}
        </q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="close"
          @click="$emit('update:modelValue', false)"
        />
      </q-toolbar>

      <q-card-section v-if="detailedHelp?.notice" class="dsl-help-notice">
        <q-icon
          :name="detailedHelp.notice.icon"
          size="18px"
          class="q-mr-sm"
          :color="detailedHelp.notice.color"
        />
        <span>
          {{ detailedHelp.notice.text }}
        </span>
      </q-card-section>

      <q-separator />

      <q-card-section class="dsl-help-body">
        <div v-if="detailedHelp?.format" class="dsl-section">
          <div class="dsl-format">
            搜索语句格式: <code>{{ detailedHelp.format }}</code>
          </div>
        </div>

        <div v-if="detailedHelp?.examples?.length" class="dsl-section">
          <div class="dsl-heading">常用样例</div>
          <p class="dsl-desc">
            先从最接近你目标的写法开始，再按需补过滤器，通常比从零拼 DSL 更快。
          </p>
          <div class="dsl-example-groups">
            <section
              v-for="group in groupedExamples"
              :key="group.label"
              class="dsl-example-group"
            >
              <div class="dsl-example-group-title">{{ group.label }}</div>
              <div class="dsl-table-wrap">
                <table class="dsl-table">
                  <thead>
                    <tr>
                      <th>查询</th>
                      <th>用途</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="example in group.items" :key="example.query">
                      <td>
                        <code>{{ example.query }}</code>
                      </td>
                      <td>{{ example.summary }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <template
          v-for="section in detailedHelp?.sections || []"
          :key="section.title"
        >
          <div class="dsl-section">
            <div class="dsl-heading">{{ section.title }}</div>
            <p v-if="section.description" class="dsl-desc">
              {{ section.description }}
            </p>

            <div v-if="section.table" class="dsl-table-wrap">
              <table class="dsl-table">
                <thead>
                  <tr>
                    <th v-for="column in section.table.columns" :key="column">
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in section.table.rows"
                    :key="`${section.title}-${row.join('-')}`"
                  >
                    <td
                      v-for="(cell, cellIndex) in row"
                      :key="`${cell}-${cellIndex}`"
                    >
                      <code
                        v-if="
                          isCodeColumn(section.table.columns.length, cellIndex)
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

            <template
              v-for="subSection in section.subSections || []"
              :key="subSection.title"
            >
              <div class="dsl-subheading">{{ subSection.title }}</div>
              <p v-if="subSection.description" class="dsl-desc">
                {{ subSection.description }}
              </p>
              <div v-if="subSection.table" class="dsl-table-wrap">
                <table class="dsl-table">
                  <thead>
                    <tr>
                      <th
                        v-for="column in subSection.table.columns"
                        :key="column"
                      >
                        {{ column }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in subSection.table.rows"
                      :key="`${subSection.title}-${row.join('-')}`"
                    >
                      <td
                        v-for="(cell, cellIndex) in row"
                        :key="`${cell}-${cellIndex}`"
                      >
                        <code
                          v-if="
                            isCodeColumn(
                              subSection.table.columns.length,
                              cellIndex
                            )
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
            </template>
          </div>
        </template>
      </q-card-section>

      <q-separator />

      <q-card-actions class="dsl-help-actions">
        <q-checkbox
          v-model="dontShowAgain"
          label="不再自动弹出"
          dense
          size="sm"
          class="dsl-dismiss-checkbox"
        />
        <q-space />
        <q-btn flat label="关闭" color="primary" @click="closeDialog" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getSearchMode, getSearchModeThemeVars } from 'src/config/searchModes';

defineOptions({ name: 'DslHelpDialog' });

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const modeMeta = getSearchMode('direct');
const detailedHelp = computed(() => modeMeta.detailedHelp);
const themeVars = computed(() => getSearchModeThemeVars(modeMeta));
const dontShowAgain = ref(!!localStorage.getItem('dslHelpDismissed'));
const groupedExamples = computed(() => {
  const items = detailedHelp.value?.examples || [];
  const groups: Array<{
    label: string;
    items: typeof items;
  }> = [];

  for (const item of items) {
    const label = item.group || '常用样例';
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.push({
      label,
      items: [item],
    });
  }

  return groups;
});

const isCodeColumn = (columnCount: number, cellIndex: number) => {
  return cellIndex === 0 || (columnCount === 3 && cellIndex === 2);
};

const closeDialog = () => {
  if (dontShowAgain.value) {
    localStorage.setItem('dslHelpDismissed', '1');
  }
  emit('update:modelValue', false);
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      dontShowAgain.value = !!localStorage.getItem('dslHelpDismissed');
    }
  }
);
</script>

<style lang="scss" scoped>
.dsl-help-card {
  display: flex;
  flex-direction: column;
  width: 90vw;
  max-width: 720px;
  max-height: 70vh;
  border-radius: 18px;
  border: 1px solid var(--mode-light-border-color);
  background: linear-gradient(
      180deg,
      var(--mode-light-soft-background),
      transparent 78%
    ),
    rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 54px rgba(15, 23, 42, 0.12);
}

.dsl-help-toolbar {
  flex-shrink: 0;
  min-height: 48px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
}

.dsl-help-title {
  font-size: 15px;
  font-weight: 700;
}

.dsl-help-notice {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  padding: 14px 20px;
  margin: 14px 16px 0;
  border-radius: 14px;
  border: 1px solid var(--mode-light-border-color);
  opacity: 0.9;
}

.dsl-help-body {
  overflow-y: auto;
  padding: 16px 20px 18px;
  font-size: 13px;
  line-height: 1.7;
}

.dsl-section {
  margin-bottom: 24px;
}

.dsl-format {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.12);
}

.dsl-heading {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--mode-light-color);
}

.dsl-subheading {
  font-size: 13px;
  font-weight: 700;
  margin: 14px 0 8px;
  color: var(--mode-light-color);
}

.dsl-desc {
  margin: 4px 0 8px;
  opacity: 0.8;
}

.dsl-table-wrap {
  overflow-x: auto;
}

.dsl-example-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dsl-example-group-title {
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  opacity: 0.62;
}

.dsl-table {
  width: 100%;
  min-width: 520px;
  background: rgba(15, 23, 42, 0.025);
  border-collapse: collapse;
  margin: 8px 0;
  border-radius: 14px;
  overflow: hidden;

  th,
  td {
    text-align: left;
    padding: 8px 10px;
    border: 1px solid rgba(128, 128, 128, 0.2);
  }

  th {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.7;
  }

  code {
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 4px;
  }
}

.dsl-help-actions {
  flex-shrink: 0;
  padding: 8px 16px;
  border-top: 1px solid rgba(128, 128, 128, 0.12);
}

.dsl-dismiss-checkbox {
  font-size: 12px;
  opacity: 0.7;
}

body.body--light {
  .dsl-help-notice {
    background: var(--mode-light-background);
  }

  .dsl-table {
    code {
      background: rgba(0, 0, 0, 0.05);
      color: #0f6f82;
    }
  }

  .dsl-help-body code {
    background: rgba(0, 0, 0, 0.05);
    color: #0f6f82;
  }
}

body.body--dark {
  .dsl-help-card {
    border-color: var(--mode-dark-border-color);
    background: linear-gradient(
        180deg,
        var(--mode-dark-soft-background),
        transparent 78%
      ),
      rgba(20, 20, 20, 0.96);
    box-shadow: none;
  }

  .dsl-help-notice {
    background: var(--mode-dark-background);
    border-color: var(--mode-dark-border-color);
  }

  .dsl-format,
  .dsl-table {
    background: rgba(255, 255, 255, 0.045);
  }

  .dsl-heading,
  .dsl-subheading {
    color: var(--mode-dark-color);
  }

  .dsl-table {
    code {
      background: rgba(255, 255, 255, 0.08);
      color: #82d7e6;
    }
  }

  .dsl-help-body code {
    background: rgba(255, 255, 255, 0.08);
    color: #82d7e6;
  }
}

@media (max-width: 640px) {
  .dsl-table {
    min-width: 0;
  }
}
</style>
