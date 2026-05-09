<template>
  <div
    v-if="suggestions.length || activeCommand"
    class="tool-command-suggestions"
  >
    <div v-if="suggestions.length" class="tool-command-list">
      <button
        v-for="command in suggestions"
        :key="command.command"
        type="button"
        class="tool-command-item"
        @mousedown.prevent="applyCommand(command.command)"
      >
        <q-icon :name="command.icon" size="16px" class="tool-command-icon" />
        <span class="tool-command-name">{{ command.command }}</span>
        <span class="tool-command-label">{{ command.label }}</span>
      </button>
    </div>

    <div v-if="activeCommand" class="tool-command-detail">
      <div class="tool-command-detail-title">
        <q-icon :name="activeCommand.icon" size="16px" />
        <span class="tool-command-name">{{ activeCommand.command }}</span>
        <span class="tool-command-label">{{ activeCommand.label }}</span>
      </div>
      <div class="tool-command-detail-desc">
        {{ activeCommand.description }}
      </div>
      <div class="tool-command-detail-usage">
        {{ activeCommand.usage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import {
  completeToolCommandText,
  getActiveToolCommand,
  getToolCommandSuggestions,
} from 'src/config/toolCommands';

const queryStore = useQueryStore();
const layoutStore = useLayoutStore();

const suggestions = computed(() =>
  getToolCommandSuggestions(queryStore.query, { showAllWhenEmpty: true })
);
const activeCommand = computed(() => getActiveToolCommand(queryStore.query));

const applyCommand = (command: string) => {
  queryStore.setQuery({
    newQuery: completeToolCommandText(queryStore.query, command),
  });
  layoutStore.resetSuggestNavigation();
  layoutStore.setIsSuggestVisible(true);
  nextTick(() => {
    window.dispatchEvent(
      new CustomEvent('bili-search:focus-input', {
        detail: { placeCaretAtEnd: true },
      })
    );
  });
};
</script>

<style lang="scss" scoped>
.tool-command-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}

.tool-command-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-command-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid rgba(0, 137, 123, 0.16);
  border-radius: 7px;
  background: rgba(0, 137, 123, 0.06);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tool-command-item:hover {
  background: rgba(0, 137, 123, 0.11);
}

.tool-command-icon {
  color: #00897b;
}

.tool-command-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #00897b;
}

.tool-command-label {
  font-size: 12px;
  font-weight: 600;
}

.tool-command-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 7px;
  background: rgba(0, 137, 123, 0.045);
  border: 1px solid rgba(0, 137, 123, 0.12);
}

.tool-command-detail-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.tool-command-detail-desc {
  font-size: 12px;
  opacity: 0.76;
}

.tool-command-detail-usage {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #00897b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

body.body--dark {
  .tool-command-item {
    border-color: rgba(77, 182, 172, 0.22);
    background: rgba(77, 182, 172, 0.1);
  }

  .tool-command-item:hover {
    background: rgba(77, 182, 172, 0.16);
  }

  .tool-command-icon,
  .tool-command-name,
  .tool-command-detail-usage {
    color: #4db6ac;
  }

  .tool-command-detail {
    border-color: rgba(77, 182, 172, 0.18);
    background: rgba(77, 182, 172, 0.08);
  }
}
</style>
