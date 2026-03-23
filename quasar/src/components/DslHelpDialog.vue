<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dsl-help-card">
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

        <template
          v-for="section in detailedHelp?.sections || []"
          :key="section.title"
        >
          <div class="dsl-section">
            <div class="dsl-heading">{{ section.title }}</div>
            <p v-if="section.description" class="dsl-desc">
              {{ section.description }}
            </p>

            <table v-if="section.table" class="dsl-table">
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

            <template
              v-for="subSection in section.subSections || []"
              :key="subSection.title"
            >
              <div class="dsl-subheading">{{ subSection.title }}</div>
              <p v-if="subSection.description" class="dsl-desc">
                {{ subSection.description }}
              </p>
              <table v-if="subSection.table" class="dsl-table">
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
            </template>

            <ul
              v-if="section.title === '三、组合示例' && detailedHelp?.examples"
              class="dsl-examples"
            >
              <li v-for="example in detailedHelp.examples" :key="example">
                <code>{{ example.split(' — ')[0] }}</code>
                <span v-if="example.includes(' — ')">
                  — {{ example.split(' — ').slice(1).join(' — ') }}
                </span>
              </li>
            </ul>
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
import { getSearchMode } from 'src/config/searchModes';

defineOptions({ name: 'DslHelpDialog' });

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const modeMeta = getSearchMode('direct');
const detailedHelp = computed(() => modeMeta.detailedHelp);
const dontShowAgain = ref(!!localStorage.getItem('dslHelpDismissed'));

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
  border-radius: 12px;
}

.dsl-help-toolbar {
  flex-shrink: 0;
  min-height: 48px;
  padding: 0 12px 0 16px;
}

.dsl-help-title {
  font-size: 15px;
  font-weight: 600;
}

.dsl-help-notice {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px 20px;
  opacity: 0.85;
}

.dsl-help-body {
  overflow-y: auto;
  padding: 16px 20px;
  font-size: 13px;
  line-height: 1.7;
}

.dsl-section {
  margin-bottom: 20px;
}

.dsl-format {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.dsl-heading {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.dsl-subheading {
  font-size: 13px;
  font-weight: 600;
  margin: 12px 0 6px;
}

.dsl-desc {
  margin: 4px 0 8px;
  opacity: 0.8;
}

.dsl-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;

  th,
  td {
    text-align: left;
    padding: 5px 10px;
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

.dsl-examples {
  padding-left: 18px;
  margin: 8px 0;

  li {
    margin: 4px 0;
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
}

.dsl-dismiss-checkbox {
  font-size: 12px;
  opacity: 0.7;
}

body.body--light {
  .dsl-help-notice {
    background: rgba(0, 137, 123, 0.06);
  }

  .dsl-table {
    code {
      background: rgba(0, 0, 0, 0.05);
      color: #c7254e;
    }
  }

  .dsl-examples code {
    background: rgba(0, 0, 0, 0.05);
    color: #c7254e;
  }
}

body.body--dark {
  .dsl-help-notice {
    background: rgba(0, 137, 123, 0.12);
  }

  .dsl-table {
    code {
      background: rgba(255, 255, 255, 0.08);
      color: #e6db74;
    }
  }

  .dsl-examples code {
    background: rgba(255, 255, 255, 0.08);
    color: #e6db74;
  }
}
</style>
