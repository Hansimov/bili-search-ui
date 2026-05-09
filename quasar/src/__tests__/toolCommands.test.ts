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
        expect(hasUnterminatedToolCommand('/owners ')).toBe(false);
        expect(getToolCommandSuggestions('/own').map((item) => item.command)).toEqual([
            '/owners',
        ]);
        expect(completeToolCommandText('/own', '/owners')).toBe('/owners ');
        expect(completeToolCommandText('、own', '/owners')).toBe('/owners ');
        expect(completeToolCommandText('\\own', '/owners')).toBe('/owners ');
    });
});
