<template>
  <div v-if="suggestions.length" class="tool-command-suggestions">
    <button
      v-for="command in suggestions"
      :key="command.command"
      type="button"
      class="tool-command-item"
      @mousedown.prevent="applyCommand(command.command)"
    >
      <q-icon :name="command.icon" size="16px" class="tool-command-icon" />
      <span class="tool-command-main">
        <span class="tool-command-name">{{ command.command }}</span>
        <span class="tool-command-label">{{ command.label }}</span>
      </span>
      <span class="tool-command-desc">{{ command.description }}</span>
      <span class="tool-command-usage">{{ command.usage }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import {
  completeToolCommandText,
  getToolCommandSuggestions,
} from 'src/config/toolCommands';

const queryStore = useQueryStore();
const layoutStore = useLayoutStore();

const suggestions = computed(() => getToolCommandSuggestions(queryStore.query));

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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 6px;
  padding: 6px;
}

.tool-command-item {
  display: grid;
  grid-template-columns: auto minmax(78px, auto) minmax(0, 1fr);
  grid-template-areas:
    'icon main desc'
    'icon main usage';
  align-items: center;
  gap: 2px 8px;
  min-width: 0;
  padding: 7px 8px;
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
  grid-area: icon;
  color: #00897b;
}

.tool-command-main {
  grid-area: main;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
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

.tool-command-desc,
.tool-command-usage {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.tool-command-desc {
  grid-area: desc;
  opacity: 0.78;
}

.tool-command-usage {
  grid-area: usage;
  color: #00897b;
  opacity: 0.9;
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
  .tool-command-usage {
    color: #4db6ac;
  }
}
</style>
