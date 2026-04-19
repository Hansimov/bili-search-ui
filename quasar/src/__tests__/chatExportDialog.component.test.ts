// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import ChatExportDialog from 'src/components/ChatSessionExportDialog.vue';
import type { ChatExportSessionBundle } from 'src/stores/chatStore';

const quasarMocks = vi.hoisted(() => ({
    notifyCreate: vi.fn(),
}));

const exportServiceMocks = vi.hoisted(() => ({
    generateChatExport: vi.fn(() => ({
        fileName: 'chat-export.json',
        mimeType: 'application/json;charset=utf-8',
        content: '{"ok":true}',
    })),
    triggerChatExportDownload: vi.fn(),
}));

vi.mock('quasar', () => ({
    exportFile: vi.fn(() => true),
    Notify: {
        create: quasarMocks.notifyCreate,
    },
}));

vi.mock('src/services/chatExport', async () => {
    const actual = await vi.importActual<typeof import('src/services/chatExport')>(
        'src/services/chatExport'
    );
    return {
        ...actual,
        generateChatExport: exportServiceMocks.generateChatExport,
        triggerChatExportDownload: exportServiceMocks.triggerChatExportDownload,
    };
});

const DialogStub = defineComponent({
    name: 'QDialogStub',
    props: {
        modelValue: Boolean,
    },
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="q-dialog-stub"><slot /></div>',
});

const BtnStub = defineComponent({
    name: 'QBtnStub',
    props: {
        label: String,
        disable: Boolean,
    },
    emits: ['click'],
    template:
        '<button class="q-btn-stub" :disabled="disable" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
});

const CheckboxStub = defineComponent({
    name: 'QCheckboxStub',
    props: {
        modelValue: Boolean,
        label: String,
    },
    emits: ['update:modelValue'],
    template:
        '<label class="q-checkbox-stub"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><span>{{ label }}</span></label>',
});

const WrapperStub = defineComponent({
    name: 'WrapperStub',
    template: '<div><slot /></div>',
});

const sampleBundle: ChatExportSessionBundle = {
    schemaVersion: 2,
    capturedAt: 1713500000000,
    exportedAt: 1713500100000,
    currentHistoryRecordId: 'history-1',
    session: {
        sessionId: 'session-export-1',
        query: '第三轮问题',
        mode: 'smart',
        content: '第三轮回答',
        thinkingContent: '',
        isLoading: false,
        isThinkingPhase: false,
        isDone: true,
        isAborted: false,
        error: null,
        perfStats: null,
        usage: null,
        usageTrace: null,
        toolEvents: [],
        streamSegments: [],
        thinking: false,
        createdAt: 1713499999000,
    },
    conversationHistory: [],
    rounds: [
        {
            index: 1,
            phase: 'historical',
            status: 'completed',
            user: { id: 'u-1', role: 'user', content: '第一轮问题' },
            assistant: { id: 'a-1', role: 'assistant', content: '第一轮回答' },
        },
        {
            index: 2,
            phase: 'historical',
            status: 'completed',
            user: { id: 'u-2', role: 'user', content: '第二轮问题' },
            assistant: { id: 'a-2', role: 'assistant', content: '第二轮回答' },
        },
        {
            index: 3,
            phase: 'current',
            status: 'completed',
            user: { id: 'u-3', role: 'user', content: '第三轮问题' },
            assistant: { id: 'a-3', role: 'assistant', content: '第三轮回答' },
        },
    ],
};

const mountDialog = async (initialSelectedRounds?: number[] | null) => {
    const wrapper = mount(ChatExportDialog, {
        props: {
            modelValue: true,
            sessionBundle: sampleBundle,
            initialSelectedRounds,
        },
        global: {
            stubs: {
                'q-dialog': DialogStub,
                'q-card': WrapperStub,
                'q-toolbar': WrapperStub,
                'q-toolbar-title': WrapperStub,
                'q-card-section': WrapperStub,
                'q-card-actions': WrapperStub,
                'q-separator': WrapperStub,
                'q-space': WrapperStub,
                'q-btn': BtnStub,
                'q-checkbox': CheckboxStub,
                'q-icon': true,
            },
        },
    });

    await nextTick();
    return wrapper;
};

describe('ChatExportDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
    });

    it('hydrates the default selected rounds and exports the filtered bundle', async () => {
        const wrapper = await mountDialog([1, 2]);

        expect(wrapper.findAll('.chat-export-round-pill.active')).toHaveLength(2);
        expect(wrapper.text()).not.toContain('附加选项');
        expect(wrapper.text()).not.toContain('保留空段落');
        expect(wrapper.text()).not.toContain('Markdown 适合阅读与归档');
        expect(wrapper.text()).not.toContain('默认选中你点击的那一轮之前');

        await wrapper
            .findAll('.chat-export-format-option')
            .find((node) => node.text() === 'JSON')
            ?.trigger('click');

        expect(wrapper.text()).toContain('格式化 JSON');

        await wrapper
            .findAll('.q-btn-stub')
            .find((node) => node.text().includes('导出 JSON'))
            ?.trigger('click');

        expect(exportServiceMocks.generateChatExport).toHaveBeenCalledTimes(1);
        const [generatedBundle, usedOptions] = exportServiceMocks.generateChatExport
            .mock.calls[0] as unknown as [
                ChatExportSessionBundle,
                { format: string },
            ];

        expect(generatedBundle.rounds.map((round) => round.index)).toEqual([1, 2]);
        expect(usedOptions.format).toBe('json');
        expect(exportServiceMocks.triggerChatExportDownload).toHaveBeenCalledTimes(1);
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    });

    it('supports clearing and restoring round selection', async () => {
        const wrapper = await mountDialog(null);

        expect(wrapper.findAll('.chat-export-round-pill.active')).toHaveLength(3);

        await wrapper
            .findAll('.chat-export-mini-action')
            .find((node) => node.text() === '清空')
            ?.trigger('click');

        expect(wrapper.findAll('.chat-export-round-pill.active')).toHaveLength(0);
        expect(
            wrapper
                .findAll('.q-btn-stub')
                .find((node) => node.text().includes('导出 Markdown'))
                ?.attributes('disabled')
        ).toBeDefined();

        await wrapper
            .findAll('.chat-export-mini-action')
            .find((node) => node.text() === '恢复默认')
            ?.trigger('click');

        expect(wrapper.findAll('.chat-export-round-pill.active')).toHaveLength(3);
    });
});