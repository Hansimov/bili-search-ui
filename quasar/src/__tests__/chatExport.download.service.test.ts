// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const quasarMocks = vi.hoisted(() => ({
    exportFile: vi.fn(() => true),
}));

vi.mock('quasar', () => ({
    exportFile: quasarMocks.exportFile,
}));

import { triggerChatExportDownload } from 'src/services/chatExport';

describe('triggerChatExportDownload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('submits the export through a hidden same-origin form', () => {
        const submitSpy = vi
            .spyOn(HTMLFormElement.prototype, 'submit')
            .mockImplementation(() => { });

        triggerChatExportDownload({
            fileName: 'chat-export.md',
            mimeType: 'text/markdown;charset=utf-8',
            content: '# Export\n\ncontent',
        });

        const form = document.querySelector('form') as HTMLFormElement | null;
        const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
        const contentField = form?.querySelector(
            'textarea[name="content"]'
        ) as HTMLTextAreaElement | null;

        expect(submitSpy).toHaveBeenCalledTimes(1);
        expect(form?.action).toContain('/api/chat/export-file');
        expect(form?.method).toBe('post');
        expect(form?.target).toContain('chat-export-download-');
        expect(contentField?.value).toBe('# Export\n\ncontent');
        expect(iframe?.name).toBe(form?.target);
        expect(quasarMocks.exportFile).not.toHaveBeenCalled();

        submitSpy.mockRestore();
    });

    it('falls back to Quasar exportFile when form submission fails', () => {
        const submitSpy = vi
            .spyOn(HTMLFormElement.prototype, 'submit')
            .mockImplementation(() => {
                throw new Error('submit unavailable');
            });

        triggerChatExportDownload({
            fileName: 'chat-export.json',
            mimeType: 'application/json;charset=utf-8',
            content: '{"ok":true}',
        });

        expect(quasarMocks.exportFile).toHaveBeenCalledWith(
            'chat-export.json',
            '{"ok":true}',
            { mimeType: 'application/json;charset=utf-8' }
        );

        submitSpy.mockRestore();
    });
});