<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="chat-export-card">
      <q-toolbar class="chat-export-toolbar">
        <q-icon
          name="download"
          size="20px"
          class="q-mr-sm"
          style="opacity: 0.55"
        />
        <q-toolbar-title class="chat-export-title">
          导出当前会话
          <span class="chat-export-subtitle">
            {{ exportSummaryText }}
          </span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" @click="closeDialog" />
      </q-toolbar>

      <q-separator />

      <q-card-section class="chat-export-body">
        <div v-if="!availableRounds.length" class="chat-export-empty">
          当前没有可导出的会话内容。
        </div>

        <template v-else>
          <div class="chat-export-meta-chips">
            <div class="chat-export-meta-chip">
              <span class="chat-export-meta-chip-label">模式</span>
              <strong>{{ exportModeLabel }}</strong>
            </div>
            <div class="chat-export-meta-chip">
              <span class="chat-export-meta-chip-label">轮次</span>
              <strong
                >{{ selectedRoundCount }} / {{ availableRounds.length }}</strong
              >
            </div>
            <div class="chat-export-meta-chip">
              <span class="chat-export-meta-chip-label">工具调用</span>
              <strong>{{ exportToolCallCount }}</strong>
            </div>
            <div class="chat-export-meta-chip chat-export-meta-chip--mono">
              <span class="chat-export-meta-chip-label">会话</span>
              <strong>{{ shortExportSessionId }}</strong>
            </div>
          </div>

          <div class="chat-export-section">
            <div class="chat-export-section-title">导出格式</div>
            <div class="chat-export-format-switch">
              <button
                v-for="option in exportFormatOptions"
                :key="option.value"
                type="button"
                class="chat-export-format-option"
                :class="{ active: exportOptions.format === option.value }"
                @click="exportOptions.format = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <div
              v-if="exportOptions.format === 'json'"
              class="chat-export-format-preferences"
            >
              <q-checkbox
                v-model="exportOptions.prettyJson"
                label="格式化 JSON"
                dense
              />
            </div>
          </div>

          <div class="chat-export-section">
            <div class="chat-export-section-head">
              <div class="chat-export-section-title">导出轮次</div>
              <div class="chat-export-inline-actions">
                <button
                  type="button"
                  class="chat-export-mini-action"
                  @click="selectAllRounds"
                >
                  全选
                </button>
                <button
                  type="button"
                  class="chat-export-mini-action"
                  @click="restoreDefaultRoundSelection"
                >
                  恢复默认
                </button>
                <button
                  type="button"
                  class="chat-export-mini-action"
                  @click="clearRoundSelection"
                >
                  清空
                </button>
              </div>
            </div>

            <div class="chat-export-round-grid">
              <button
                v-for="round in availableRounds"
                :key="round.index"
                type="button"
                class="chat-export-round-pill"
                :class="{ active: isRoundSelected(round.index) }"
                @click="toggleRoundSelection(round.index)"
              >
                <span class="chat-export-round-pill-top">
                  <span class="chat-export-round-pill-index">
                    第 {{ round.index }} 轮
                  </span>
                  <span
                    class="chat-export-round-pill-status"
                    :class="`is-${round.status}`"
                  >
                    {{ getRoundStatusLabel(round) }}
                  </span>
                </span>
                <span class="chat-export-round-pill-query">
                  {{ summarizeRound(round) }}
                </span>
              </button>
            </div>
          </div>

          <div class="chat-export-section">
            <div class="chat-export-section-title">包含内容</div>
            <div
              class="chat-export-checkbox-grid chat-export-checkbox-grid--triple"
            >
              <q-checkbox
                v-model="exportOptions.sections.sessionMeta"
                label="会话元信息"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.userInputs"
                label="用户输入"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.thinking"
                label="思考过程"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.toolInputs"
                label="工具输入"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.toolResults"
                label="工具结果"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.finalAnswers"
                label="最终回答"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.perfStats"
                label="性能与用量"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.modelTrace"
                label="模型轨迹"
                dense
              />
              <q-checkbox
                v-model="exportOptions.sections.rawTimeline"
                label="原始时间线"
                dense
              />
            </div>
          </div>
        </template>
      </q-card-section>

      <q-separator />

      <q-card-actions class="chat-export-actions">
        <div v-if="availableRounds.length" class="chat-export-actions-note">
          {{ exportSelectionSummary }}
        </div>
        <q-space />
        <q-btn flat label="取消" color="grey-7" @click="closeDialog" />
        <q-btn
          color="primary"
          unelevated
          :disable="isExportDisabled"
          :label="exportButtonLabel"
          @click="handleExportSession"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, reactive, ref, watch } from 'vue';
import type {
  ChatExportRound,
  ChatExportSessionBundle,
} from 'src/stores/chatStore';
import {
  DEFAULT_CHAT_EXPORT_OPTIONS,
  type ChatExportOptions,
  type ChatExportFormat,
  buildPrefixExportRoundSelection,
  cloneChatExportOptions,
  countExportToolCalls,
  filterChatExportBundle,
  generateChatExport,
  getAvailableExportRoundIndexes,
  normalizeSelectedRoundIndexes,
  triggerChatExportDownload,
} from 'src/services/chatExport';

defineOptions({ name: 'ChatExportDialog' });

const EXPORT_PREFERENCES_KEY = 'chatExportOptions';

type StoredChatExportOptions = Partial<
  Pick<ChatExportOptions, 'format' | 'prettyJson'>
> & {
  sections?: Partial<ChatExportOptions['sections']>;
};

const props = defineProps<{
  modelValue: boolean;
  sessionBundle: ChatExportSessionBundle;
  initialSelectedRounds?: number[] | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const exportOptions = reactive(
  cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS)
);
const selectedRoundIndexes = ref<number[]>([]);
const exportFormatOptions: Array<{ label: string; value: ChatExportFormat }> = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'JSON', value: 'json' },
];

const isChatExportFormat = (value: unknown): value is ChatExportFormat => {
  return value === 'markdown' || value === 'json';
};

const applyStoredExportOptions = (stored?: StoredChatExportOptions | null) => {
  const defaults = cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS);
  Object.assign(exportOptions, defaults, {
    format: isChatExportFormat(stored?.format)
      ? stored.format
      : defaults.format,
    prettyJson:
      typeof stored?.prettyJson === 'boolean'
        ? stored.prettyJson
        : defaults.prettyJson,
    sections: {
      ...defaults.sections,
      ...(stored?.sections || {}),
    },
  });
};

const loadSavedExportOptions = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    applyStoredExportOptions();
    return;
  }

  try {
    const raw = window.localStorage.getItem(EXPORT_PREFERENCES_KEY);
    if (!raw) {
      applyStoredExportOptions();
      return;
    }

    const parsed = JSON.parse(raw) as StoredChatExportOptions;
    applyStoredExportOptions(parsed);
  } catch {
    applyStoredExportOptions();
  }
};

const persistExportOptions = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      EXPORT_PREFERENCES_KEY,
      JSON.stringify(cloneChatExportOptions(exportOptions))
    );
  } catch {
    // Ignore local preference persistence failures.
  }
};

const hydrateSelectedRounds = () => {
  selectedRoundIndexes.value = normalizeSelectedRoundIndexes(
    props.sessionBundle,
    props.initialSelectedRounds
  );
};

const hydrateDialogState = () => {
  loadSavedExportOptions();
  hydrateSelectedRounds();
};

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      hydrateDialogState();
    }
  },
  { immediate: true }
);

watch(
  () => [
    props.initialSelectedRounds?.join(',') || '',
    props.sessionBundle.rounds.length,
    props.sessionBundle.exportedAt,
  ],
  () => {
    if (props.modelValue) {
      hydrateSelectedRounds();
    }
  }
);

const availableRounds = computed(() => props.sessionBundle.rounds);
const availableRoundIndexes = computed(() =>
  getAvailableExportRoundIndexes(props.sessionBundle)
);
const filteredBundle = computed(() =>
  filterChatExportBundle(props.sessionBundle, selectedRoundIndexes.value)
);
const selectedRoundCount = computed(() => filteredBundle.value.rounds.length);
const selectedExportSectionCount = computed(
  () => Object.values(exportOptions.sections).filter(Boolean).length
);
const exportToolCallCount = computed(() =>
  countExportToolCalls(filteredBundle.value)
);
const exportModeLabel = computed(() =>
  props.sessionBundle.session.mode === 'think' ? '智能思考' : '快速问答'
);
const shortExportSessionId = computed(() =>
  props.sessionBundle.session.sessionId.slice(0, 8)
);
const exportSummaryText = computed(
  () =>
    `${selectedRoundCount.value}/${availableRounds.value.length} 轮对话 · ${exportToolCallCount.value} 次工具调用`
);

const formatRoundRanges = (indexes: number[]): string => {
  if (!indexes.length) {
    return '';
  }

  const ranges: string[] = [];
  let rangeStart = indexes[0];
  let previous = indexes[0];

  for (let index = 1; index < indexes.length; index += 1) {
    const current = indexes[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }

    ranges.push(
      rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`
    );
    rangeStart = current;
    previous = current;
  }

  ranges.push(
    rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`
  );
  return ranges.join(', ');
};

const selectedRoundLabel = computed(() => {
  if (!selectedRoundIndexes.value.length) {
    return '未选择轮次';
  }
  return `第 ${formatRoundRanges(selectedRoundIndexes.value)} 轮`;
});

const exportSelectionSummary = computed(() => {
  const formatText = exportOptions.format === 'json' ? 'JSON' : 'Markdown';
  return `将导出 ${selectedRoundLabel.value}，共 ${selectedRoundCount.value} 轮，${selectedExportSectionCount.value} 个内容分区，格式为 ${formatText}`;
});

const exportButtonLabel = computed(() =>
  exportOptions.format === 'json' ? '导出 JSON' : '导出 Markdown'
);

const isExportDisabled = computed(
  () =>
    !availableRounds.value.length ||
    selectedRoundCount.value === 0 ||
    selectedExportSectionCount.value === 0
);

const isRoundSelected = (roundIndex: number) => {
  return selectedRoundIndexes.value.includes(roundIndex);
};

const toggleRoundSelection = (roundIndex: number) => {
  if (isRoundSelected(roundIndex)) {
    selectedRoundIndexes.value = selectedRoundIndexes.value.filter(
      (index) => index !== roundIndex
    );
    return;
  }

  selectedRoundIndexes.value = [...selectedRoundIndexes.value, roundIndex].sort(
    (left, right) => left - right
  );
};

const selectAllRounds = () => {
  selectedRoundIndexes.value = [...availableRoundIndexes.value];
};

const restoreDefaultRoundSelection = () => {
  selectedRoundIndexes.value = props.initialSelectedRounds
    ? normalizeSelectedRoundIndexes(
        props.sessionBundle,
        props.initialSelectedRounds
      )
    : buildPrefixExportRoundSelection(props.sessionBundle);
};

const clearRoundSelection = () => {
  selectedRoundIndexes.value = [];
};

const summarizeRound = (round: ChatExportRound) => {
  const text =
    round.user?.content?.trim() ||
    round.assistant?.content?.trim() ||
    `第 ${round.index} 轮`;
  return text.length > 26 ? `${text.slice(0, 26)}…` : text;
};

const getRoundStatusLabel = (round: ChatExportRound) => {
  if (round.phase === 'current' && round.status === 'completed') {
    return '当前';
  }

  switch (round.status) {
    case 'completed':
      return '完成';
    case 'in-progress':
      return '进行中';
    case 'aborted':
      return '中止';
    case 'error':
      return '错误';
    default:
      return '未知';
  }
};

const closeDialog = () => {
  emit('update:modelValue', false);
};

const handleExportSession = () => {
  if (isExportDisabled.value) {
    return;
  }

  try {
    const generated = generateChatExport(filteredBundle.value, exportOptions);
    triggerChatExportDownload(generated);
    persistExportOptions();
    closeDialog();
    Notify.create({
      message: `已导出 ${generated.fileName}`,
      color: 'positive',
      position: 'bottom',
      timeout: 1600,
    });
  } catch (error) {
    Notify.create({
      message: `导出失败: ${
        error instanceof Error ? error.message : '未知错误'
      }`,
      color: 'negative',
      position: 'bottom',
      timeout: 1800,
    });
  }
};
</script>

<style lang="scss" scoped>
.chat-export-card {
  display: flex;
  flex-direction: column;
  width: min(820px, 92vw);
  max-height: 82vh;
  border-radius: 16px;
  overflow: hidden;
}

.chat-export-toolbar {
  min-height: 52px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}

.chat-export-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 15px;
  font-weight: 520;
}

.chat-export-subtitle {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.56;
}

.chat-export-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  padding: 16px 18px 18px;
}

.chat-export-empty {
  padding: 22px 6px;
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.7;
}

.chat-export-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chat-export-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(128, 128, 128, 0.12);
  background: rgba(128, 128, 128, 0.05);
  font-size: 12px;
  line-height: 1.2;
}

.chat-export-meta-chip strong {
  font-size: 13px;
  font-weight: 600;
}

.chat-export-meta-chip-label {
  opacity: 0.58;
}

.chat-export-meta-chip--mono strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    Liberation Mono, Courier New, monospace;
}

.chat-export-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-export-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.chat-export-section-title {
  font-size: 13px;
  font-weight: 600;
}

.chat-export-inline-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chat-export-mini-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.62;
  cursor: pointer;
}

.chat-export-mini-action:hover {
  opacity: 0.9;
}

.chat-export-format-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chat-export-format-preferences {
  display: flex;
  align-items: center;
}

.chat-export-format-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  padding: 7px 12px;
  border: 1px solid rgba(128, 128, 128, 0.12);
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.035);
  color: inherit;
  font: inherit;
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.72;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, opacity 0.16s ease;
}

.chat-export-format-option:hover {
  opacity: 0.9;
  border-color: rgba(128, 128, 128, 0.2);
}

.chat-export-format-option.active {
  opacity: 1;
  background: rgba(24, 144, 255, 0.1);
  border-color: rgba(24, 144, 255, 0.34);
}

.chat-export-round-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.chat-export-round-pill {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(128, 128, 128, 0.12);
  border-radius: 14px;
  background: rgba(128, 128, 128, 0.035);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease,
    transform 0.16s ease;
}

.chat-export-round-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(128, 128, 128, 0.22);
}

.chat-export-round-pill.active {
  background: rgba(24, 144, 255, 0.08);
  border-color: rgba(24, 144, 255, 0.34);
}

.chat-export-round-pill-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-export-round-pill-index {
  font-size: 12px;
  font-weight: 600;
}

.chat-export-round-pill-status {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  background: rgba(128, 128, 128, 0.08);
  opacity: 0.72;
}

.chat-export-round-pill-status.is-completed {
  color: #1f8f5f;
}

.chat-export-round-pill-status.is-in-progress {
  color: #ad7a08;
}

.chat-export-round-pill-status.is-aborted,
.chat-export-round-pill-status.is-error {
  color: #bf4d4d;
}

.chat-export-round-pill-query {
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.76;
}

.chat-export-checkbox-grid {
  display: grid;
  gap: 8px 12px;
}

.chat-export-checkbox-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.chat-export-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 12px;
}

.chat-export-actions-note {
  font-size: 12px;
  opacity: 0.6;
}

body.body--light .chat-export-card {
  background: #fff;
}

body.body--dark .chat-export-card {
  background: var(--q-dark-page);
}

@media (max-width: 640px) {
  .chat-export-checkbox-grid--triple {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .chat-export-card {
    width: min(94vw, 820px);
  }

  .chat-export-body {
    padding: 14px 14px 16px;
  }

  .chat-export-section-head {
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .chat-export-checkbox-grid--triple {
    grid-template-columns: 1fr;
  }

  .chat-export-round-grid {
    grid-template-columns: 1fr;
  }
}
</style>
