export interface ToolCommandOption {
    command: string;
    tool: string;
    icon: string;
    label: string;
    description: string;
    usage: string;
    aliases?: string[];
}

export const TOOL_COMMANDS: ToolCommandOption[] = [
    {
        command: '/videos',
        tool: 'search_videos',
        icon: 'search',
        label: '视频',
        description: '搜索 B 站视频，支持关键词和过滤器',
        usage: '/videos 黑神话 :date<=30d',
        aliases: ['v', 'vd', 'video'],
    },
    {
        command: '/owners',
        tool: 'search_owners',
        icon: 'person_search',
        label: '作者',
        description: '搜索作者、UP 主、别名和关联账号',
        usage: '/owners 影视飓风',
        aliases: ['o', 'up', 'owner'],
    },
    {
        command: '/explore',
        tool: 'explore',
        icon: 'travel_explore',
        label: '探索',
        description: '使用探索搜索流程返回视频结果',
        usage: '/explore 红警月亮3',
        aliases: ['e', 'exp'],
    },
    {
        command: '/google',
        tool: 'search_google',
        icon: 'public',
        label: '网页',
        description: '搜索站外网页、官网、公告和事实来源',
        usage: '/google Gemini release notes num=5',
        aliases: ['g', 'gg', 'web'],
    },
    {
        command: '/transcript',
        tool: 'get_video_transcript',
        icon: 'subtitles',
        label: '转写',
        description: '读取指定视频的音频转写或字幕',
        usage: '/transcript BV1...',
        aliases: ['t', 'ts', 'scr'],
    },
    {
        command: '/ask',
        tool: 'ask_transcript',
        icon: 'smart_toy',
        label: '提问',
        description: '读取一个或多个 BV 视频转写，并按你的问题回答',
        usage: '/ask BV1... 请告诉我这个视频中提到了什么',
        aliases: ['a', 'qa', 'ask'],
    },
    {
        command: '/summarize',
        tool: 'summarize_transcript',
        icon: 'summarize',
        label: '总结',
        description: '读取一个或多个 BV 视频的完整转写，并生成中文总结',
        usage: '/summarize BV1... BV2...',
        aliases: ['s', 'sum', 'summary', 'smr'],
    },
    {
        command: '/comments',
        tool: 'video_comments',
        icon: 'forum',
        label: '评论',
        description: '快速读取指定 BV 视频的热门评论，默认最多 20 条',
        usage: '/comments BV1...',
        aliases: ['c', 'comment'],
    },
    {
        command: '/comments_full',
        tool: 'video_comments_full',
        icon: 'rate_review',
        label: '完整评论',
        description: '完整模式读取指定 BV 视频评论，默认最多 100 条',
        usage: '/comments_full BV1...',
        aliases: ['cf', 'comments-full', 'comment_full'],
    },
];

const FIRST_NON_SPACE_ALT_SLASH_RE = /^(\s*)[、\\]/;
const FIRST_NON_SPACE_DUPLICATE_ALT_SLASH_RE = /^(\s*)\/[、\\]/;

export const normalizeToolCommandInput = (value: string): string =>
    String(value || '')
        .replace(FIRST_NON_SPACE_ALT_SLASH_RE, '$1/')
        .replace(FIRST_NON_SPACE_DUPLICATE_ALT_SLASH_RE, '$1/');

export const getToolCommandDraft = (value: string): string => {
    const normalized = normalizeToolCommandInput(value).trimStart();
    const match = normalized.match(/^(\/?\S*)$/);
    return match?.[1] || '';
};

const normalizeCommandDraft = (value: string): string =>
    String(value || '').replace(/^\//, '').toLowerCase();

const findExactToolCommand = (value: string): ToolCommandOption | null => {
    const normalized = normalizeToolCommandInput(value).trimStart();
    const token = normalized.split(/\s+/, 1)[0] || '';
    const commandName = normalizeCommandDraft(token);
    if (!commandName) return null;
    return (
        TOOL_COMMANDS.find(
            (item) => normalizeCommandDraft(item.command) === commandName
        ) || null
    );
};

const commandMatchScore = (
    item: ToolCommandOption,
    draftValue: string
): number => {
    if (String(draftValue || '').trim() === '/') return 50;
    const draft = normalizeCommandDraft(draftValue);
    if (!draft) return -1;
    const commandName = normalizeCommandDraft(item.command);
    if (commandName === draft) return 100;
    if (commandName.startsWith(draft)) return 90 - draft.length / 100;
    const aliases = item.aliases || [];
    if (aliases.some((alias) => alias.toLowerCase() === draft)) return 85;
    if (aliases.some((alias) => alias.toLowerCase().startsWith(draft))) return 80;
    if (draft.length <= 2) return -1;

    let index = 0;
    for (const char of draft) {
        index = commandName.indexOf(char, index);
        if (index < 0) return -1;
        index += 1;
    }
    return 60 - commandName.length / 100;
};

export const getToolCommandSuggestions = (
    value: string,
    options: { showAllWhenEmpty?: boolean } = {}
): ToolCommandOption[] => {
    const normalized = normalizeToolCommandInput(value).trim();
    const draft = getToolCommandDraft(value);
    if (!draft) {
        const exactCommand = findExactToolCommand(value);
        if (exactCommand) return [exactCommand];
        if (!normalized && options.showAllWhenEmpty) return TOOL_COMMANDS;
        return [];
    }
    return TOOL_COMMANDS.map((item) => ({
        item,
        score: commandMatchScore(item, draft),
    }))
        .filter(({ score }) => score >= 0)
        .sort((left, right) => right.score - left.score)
        .map(({ item }) => item);
};

export const getActiveToolCommand = (
    value: string
): ToolCommandOption | null => {
    return findExactToolCommand(value);
};

export const hasUnterminatedToolCommand = (value: string): boolean => {
    const normalized = normalizeToolCommandInput(value).trimStart();
    return !!getToolCommandDraft(normalized) && !/\s/.test(normalized);
};

export const completeToolCommandText = (
    value: string,
    command: string
): string => {
    const normalized = normalizeToolCommandInput(value);
    const leading = normalized.match(/^\s*/)?.[0] || '';
    const rest = normalized.trimStart().replace(/^\/?\S*/, '').trimStart();
    return `${leading}${command}${rest ? ` ${rest}` : ' '}`;
};
