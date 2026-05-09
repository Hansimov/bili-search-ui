export interface ToolCommandOption {
    command: string;
    tool: string;
    icon: string;
    label: string;
    description: string;
    usage: string;
}

export const TOOL_COMMANDS: ToolCommandOption[] = [
    {
        command: '/videos',
        tool: 'search_videos',
        icon: 'search',
        label: '视频',
        description: '搜索 B 站视频，支持关键词和过滤器',
        usage: '/videos 黑神话 :date<=30d',
    },
    {
        command: '/owners',
        tool: 'search_owners',
        icon: 'person_search',
        label: '作者',
        description: '搜索作者、UP 主、别名和关联账号',
        usage: '/owners 影视飓风 size=5',
    },
    {
        command: '/explore',
        tool: 'explore',
        icon: 'travel_explore',
        label: '探索',
        description: '使用探索搜索流程返回视频结果',
        usage: '/explore 红警月亮3',
    },
    {
        command: '/google',
        tool: 'search_google',
        icon: 'public',
        label: '网页',
        description: '搜索站外网页、官网、公告和事实来源',
        usage: '/google Gemini release notes num=5',
    },
    {
        command: '/transcript',
        tool: 'get_video_transcript',
        icon: 'subtitles',
        label: '转写',
        description: '读取指定视频的音频转写或字幕',
        usage: '/transcript BV1...',
    },
    {
        command: '/llm',
        tool: 'run_small_llm_task',
        icon: 'smart_toy',
        label: '整理',
        description: '让轻量模型执行关键词整理、压缩或归纳',
        usage: '/llm 整理这组搜索关键词',
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
    const match = normalized.match(/^(\/\S*)$/);
    return match?.[1] || '';
};

export const getToolCommandSuggestions = (
    value: string
): ToolCommandOption[] => {
    const draft = getToolCommandDraft(value);
    if (!draft) return [];
    return TOOL_COMMANDS.filter((item) => item.command.startsWith(draft));
};

export const hasUnterminatedToolCommand = (value: string): boolean => {
    const normalized = normalizeToolCommandInput(value).trimStart();
    return normalized.startsWith('/') && !/\s/.test(normalized);
};

export const completeToolCommandText = (
    value: string,
    command: string
): string => {
    const normalized = normalizeToolCommandInput(value);
    const leading = normalized.match(/^\s*/)?.[0] || '';
    const rest = normalized.trimStart().replace(/^\/\S*/, '').trimStart();
    return `${leading}${command}${rest ? ` ${rest}` : ' '}`;
};
