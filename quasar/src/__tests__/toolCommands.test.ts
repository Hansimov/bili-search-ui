import { describe, expect, it } from 'vitest';
import {
    completeToolCommandText,
    getToolCommandSuggestions,
    hasUnterminatedToolCommand,
    normalizeToolCommandInput,
} from 'src/config/toolCommands';

describe('tool command helpers', () => {
    it('normalizes leading alternate slash in tool mode input', () => {
        expect(normalizeToolCommandInput('、owners 影视飓风')).toBe('/owners 影视飓风');
        expect(normalizeToolCommandInput('  、google Gemini')).toBe('  /google Gemini');
        expect(normalizeToolCommandInput('\\owners 影视飓风')).toBe('/owners 影视飓风');
        expect(normalizeToolCommandInput('  \\google Gemini')).toBe('  /google Gemini');
        expect(normalizeToolCommandInput('/、owners 影视飓风')).toBe('/owners 影视飓风');
        expect(normalizeToolCommandInput('/\\owners 影视飓风')).toBe('/owners 影视飓风');
    });

    it('suggests and completes unterminated slash commands only', () => {
        expect(hasUnterminatedToolCommand('/own')).toBe(true);
        expect(hasUnterminatedToolCommand('、own')).toBe(true);
        expect(hasUnterminatedToolCommand('\\own')).toBe(true);
        expect(hasUnterminatedToolCommand('vd')).toBe(true);
        expect(hasUnterminatedToolCommand('/owners ')).toBe(false);
        expect(getToolCommandSuggestions('/').length).toBeGreaterThan(1);
        expect(getToolCommandSuggestions('', { showAllWhenEmpty: true }).length).toBeGreaterThan(1);
        expect(getToolCommandSuggestions('')).toEqual([]);
        expect(
            getToolCommandSuggestions('上海 外滩', { showAllWhenEmpty: true })
        ).toEqual([]);
        expect(
            getToolCommandSuggestions('/google 上海', { showAllWhenEmpty: true }).map(
                (item) => item.command
            )
        ).toEqual(['/google']);
        expect(
            getToolCommandSuggestions('/ask BV1AA411c7mD 请总结', {
                showAllWhenEmpty: true,
            }).map((item) => item.command)
        ).toEqual(['/ask']);
        expect(getToolCommandSuggestions('/own').map((item) => item.command)).toEqual([
            '/owners',
        ]);
        expect(getToolCommandSuggestions('/su').map((item) => item.command)).toEqual([
            '/summarize',
        ]);
        expect(getToolCommandSuggestions('vd')[0]?.command).toBe('/videos');
        expect(getToolCommandSuggestions('gg')[0]?.command).toBe('/google');
        expect(getToolCommandSuggestions('scr')[0]?.command).toBe('/transcript');
        expect(getToolCommandSuggestions('qa')[0]?.command).toBe('/ask');
        expect(getToolCommandSuggestions('smr')[0]?.command).toBe('/summarize');
        expect(getToolCommandSuggestions('cf')[0]?.command).toBe('/comments_full');
        expect(completeToolCommandText('/own', '/owners')).toBe('/owners ');
        expect(completeToolCommandText('、own', '/owners')).toBe('/owners ');
        expect(completeToolCommandText('\\own', '/owners')).toBe('/owners ');
        expect(completeToolCommandText('vd', '/videos')).toBe('/videos ');
    });
});
