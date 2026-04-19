// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const quasarMocks = vi.hoisted(() => ({
    exportFile: vi.fn(() => true),
}));

const urlMocks = vi.hoisted(() => ({
    createObjectURL: vi.fn(() => 'blob:chat-export'),
    revokeObjectURL: vi.fn(),
}));

vi.mock('quasar', () => ({
    exportFile: quasarMocks.exportFile,
}));

import { triggerChatExportDownload } from 'src/services/chatExport';

describe('triggerChatExportDownload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        vi.stubGlobal('URL', {
            createObjectURL: urlMocks.createObjectURL,
            revokeObjectURL: urlMocks.revokeObjectURL,
        });
    });

    it('downloads the export via a blob URL with the generated filename', () => {
        vi.useFakeTimers();
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => { });

        triggerChatExportDownload({
            fileName: 'chat-export.md',
            mimeType: 'text/markdown;charset=utf-8',
            content: '# Export\n\ncontent',
        });

        const anchor = document.querySelector('a') as HTMLAnchorElement | null;

        expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(anchor?.download).toBe('chat-export.md');
        expect(anchor?.href).toBe('blob:chat-export');
        expect(quasarMocks.exportFile).not.toHaveBeenCalled();

        vi.runAllTimers();
        expect(urlMocks.revokeObjectURL).toHaveBeenCalledWith('blob:chat-export');

        clickSpy.mockRestore();
        vi.useRealTimers();
    });

    it('falls back to Quasar exportFile when blob download fails', () => {
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {
                throw new Error('download unavailable');
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

        expect(urlMocks.revokeObjectURL).toHaveBeenCalledWith('blob:chat-export');

        clickSpy.mockRestore();
    });
});