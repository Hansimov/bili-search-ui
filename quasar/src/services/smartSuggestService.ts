/**
 * SmartSuggestService - 前端智能搜索补全引擎
 *
 * 完全在前端实现的智能搜索建议与补全系统，支持：
 * - 中文 / 英文 / 拼音（全拼+首字母缩写+部分拼音） / 混合输入匹配
 * - 基于搜索历史的推荐
 * - 基于搜索结果元数据（title, tags, desc, owner.name）的推荐
 * - 前缀匹配、模糊匹配、子序列匹配
 * - 评分排序与去重
 * - 不同类型点击行为：文本直接搜索，视频 bv=... ，用户 uid=...
 *
 * 使用轻量拼音库实现按需拼音转换。
 */

import { ref } from 'vue';

type PinyinToken = {
    type: 1 | 2 | 3;
    source: string;
    target: string;
};
type PinyinLib = {
    isSupported(force?: boolean): boolean;
    parse(text: string): PinyinToken[];
    convertToPinyin(text: string, separator?: string, lowerCase?: boolean): string;
    patchDict?(patcher: (dict: { EXCEPTIONS: Record<string, string> }) => void): void;
};
type PinyinInfo = { full: string; initials: string };
let _pinyin: PinyinLib | null = null;
let _pinyinPromise: Promise<PinyinLib> | null = null;
let _pinyinUnavailable = false;

export function loadPinyin(): Promise<PinyinLib> {
    if (_pinyin) return Promise.resolve(_pinyin);
    if (_pinyinUnavailable) {
        return Promise.reject(new Error('pinyin support is unavailable'));
    }
    if (!_pinyinPromise) {
        _pinyinPromise = import('tiny-pinyin')
            .then(m => {
                const candidate = (m.default ?? m) as unknown as PinyinLib;
                candidate.patchDict?.((dict) => {
                    dict.EXCEPTIONS = {
                        ...dict.EXCEPTIONS,
                        茄: 'QIE',
                    };
                });
                if (!candidate?.isSupported?.()) {
                    throw new Error('tiny-pinyin is not supported in current runtime');
                }
                _pinyin = candidate;
                suggestIndexVersion.value++;
                return _pinyin!;
            })
            .catch((error) => {
                _pinyinPromise = null;
                _pinyinUnavailable = true;
                throw error;
            });
    }
    return _pinyinPromise!;
}

function requestPinyinLoad(): void {
    if (_pinyin || _pinyinPromise || _pinyinUnavailable) {
        return;
    }
    void loadPinyin().catch(() => undefined);
}

function getPinyinSync(): PinyinLib | null {
    return _pinyin;
}

/** 响应式版本号：每次索引变更时递增，供 Vue computed 追踪依赖 */
export const suggestIndexVersion = ref(0);

/** 建议类型：历史/视频/UP主/标签/短语 */
export type SuggestionType = 'history' | 'title' | 'author' | 'tag' | 'phrase';

/** 建议元数据（bvid/uid 供不同类型的点击行为使用） */
export interface SuggestionMeta {
    bvid?: string;
    uid?: number | string;
}

/** 自动补全建议项 */
export interface SmartSuggestion {
    /** 建议文本 */
    text: string;
    /** 建议类型 */
    type: SuggestionType;
    /** 匹配分数 (0-100) */
    score: number;
    /** HTML 高亮文本 */
    highlightedText: string;
    /** 关联元数据 */
    meta?: SuggestionMeta;
    /** 来源描述（可选） */
    source?: string;
    /** 关联的搜索时间戳（历史类型） */
    timestamp?: number;
    /** 关联的结果数量（历史类型） */
    resultCount?: number;
}

/** 索引条目 */
interface IndexEntry {
    /** 原始文本 */
    text: string;
    /** 小写化文本 */
    lower: string;
    /** 拼音全拼（空格分割）：如 "ying shi ju feng" */
    pinyinFull?: string;
    /** 拼音首字母：如 "ysjf" */
    pinyinInitials?: string;
    /** 类型 */
    type: SuggestionType;
    /** 频次 / 权重 */
    weight: number;
    /** 元数据 */
    meta?: SuggestionMeta;
    /** 来源描述 */
    source?: string;
    /** 时间戳 */
    timestamp?: number;
    /** 关联结果数 */
    resultCount?: number;
    /** 视频数据评分（用于 UP 主排序） */
    videoScore?: number;
}

/** 共现词组合条目 */
interface CoOccurrenceEntry {
    /** 组合文本 */
    text: string;
    /** 组成 token 列表 */
    tokens: string[];
    /** 出现次数 */
    count: number;
}

// ==================== 拼音工具 ====================

/** 缓存：text → { full, initials } */
const pinyinCache = new Map<string, { full: string; initials: string }>();

const EMPTY_PINYIN_INFO: PinyinInfo = { full: '', initials: '' };

/**
 * 获取文本的拼音信息（全拼 + 首字母）
 * 使用轻量拼音库生成全拼和首字母。
 */
function getPinyinInfo(text: string): { full: string; initials: string } {
    if (!text) return { full: '', initials: '' };

    const cached = pinyinCache.get(text);
    if (cached) return cached;

    // 分字处理：中文用拼音库，非中文保留原样
    const chars = Array.from(text);
    const fullParts: string[] = [];
    const initialParts: string[] = [];

    // 收集连续中文段一起处理。
    let chineseBuf = '';
    const flushChinese = () => {
        if (!chineseBuf) return;
        const pinyinLib = getPinyinSync();
        if (pinyinLib) {
            try {
                const tokens = pinyinLib.parse(chineseBuf);
                for (const token of tokens) {
                    if (token.type !== 2) {
                        continue;
                    }
                    const p = token.target.toLowerCase();
                    fullParts.push(p);
                    initialParts.push(p.charAt(0));
                }
            } catch {
            }
        }
        chineseBuf = '';
    };

    for (const ch of chars) {
        const code = ch.charCodeAt(0);
        if (code >= 0x4E00 && code <= 0x9FFF) {
            // CJK character
            chineseBuf += ch;
        } else {
            flushChinese();
            const lower = ch.toLowerCase();
            if (/[a-z0-9]/.test(lower)) {
                fullParts.push(lower);
                initialParts.push(lower);
            }
            // skip other chars (spaces, punctuation)
        }
    }
    flushChinese();

    const info = {
        full: fullParts.join(' '),
        initials: initialParts.join(''),
    };

    // 限制缓存大小
    if (pinyinCache.size > 10000) {
        const firstKey = pinyinCache.keys().next().value;
        if (firstKey !== undefined) {
            pinyinCache.delete(firstKey);
        }
    }
    pinyinCache.set(text, info);
    return info;
}

function getEntryPinyinInfo(entry: IndexEntry): PinyinInfo | null {
    if (entry.pinyinFull !== undefined && entry.pinyinInitials !== undefined) {
        return {
            full: entry.pinyinFull,
            initials: entry.pinyinInitials,
        };
    }

    if (!getPinyinSync()) {
        return null;
    }

    const info = getPinyinInfo(entry.text);
    entry.pinyinFull = info.full;
    entry.pinyinInitials = info.initials;
    return info;
}

/**
 * 检测输入是否可能为拼音/英文字母（允许数字混合）
 */
function isPossiblyPinyin(input: string): boolean {
    // 至少包含一个字母，且只由字母和数字组成
    return /^[a-z0-9]+$/.test(input) && /[a-z]/.test(input) && input.length >= 1;
}

/**
 * 检测文本是否包含中文字符
 */
function hasChinese(text: string): boolean {
    return /[\u4E00-\u9FFF]/.test(text);
}

function getTextLength(text: string): number {
    return Array.from(text || '').length;
}

// ==================== 文本处理工具 ====================

/**
 * 清理和标准化文本
 */
function normalizeText(text: string): string {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '')     // 移除 HTML 标签
        .replace(/\s+/g, ' ')        // 合并空格
        .trim()
        .toLowerCase();
}

/**
 * 去除文本开头的无意义特殊字符前缀（@、#、￥等）
 * 这些字符在社交媒体中常见，但在搜索建议中是噪声
 */
function stripLeadingNoise(text: string): string {
    return text.replace(/^[@#＠＃￥$]+/, '').trim();
}

/**
 * 判断短语是否为 CJK 为主（CJK 字符占比 > 50%）
 */
function isCjkDominant(text: string): boolean {
    const cjkCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
    return cjkCount > text.length * 0.5;
}

/**
 * 验证短语长度是否在合理范围内：
 * - CJK 为主的短语：2-8 个字符
 * - 英文/数字为主的短语：2-25 个字符
 */
function isValidPhraseLength(text: string): boolean {
    if (!text || text.length < 2) return false;
    if (isCjkDominant(text)) {
        return text.length <= 8;
    }
    return text.length <= 25;
}

/**
 * 提取文本中的关键词
 */
function extractKeywords(text: string): string[] {
    if (!text) return [];
    const normalized = normalizeText(text);
    const words = normalized.split(/[\s,，。、；;：:！!？?·\-_|/\\]+/);
    return words
        .map((w) => stripLeadingNoise(stripPunctuation(w)))
        .filter((w) => w.length >= 2 && isValidPhraseLength(w));
}

// ==================== 短语提取工具 ====================

/** 清除所有标点符号（中英文标点、特殊符号），用于标签/短语提取前的预处理 */
const PUNCTUATION_PATTERN = /[,，。、；;：:！!？?.·\-_|/\\~…“”‘’《》〈〉『』【】\[\]()\(\)（）｜—「」#@&%^*+=<>{}"'`～…–•●○■□★☆♡❤♪♫]+/g;

/**
 * 去除字符串中的所有标点符号
 */
function stripPunctuation(text: string): string {
    return text.replace(PUNCTUATION_PATTERN, '').trim();
}

/** CJK 虚词/助词/语气词，用作短语切分边界 */
const CJK_BOUNDARY_PATTERN = /[的了着过吗吧呢啊呀哦啦嗯么呗嘛哇]/g;

/** 常见无意义单字前缀（代词、副词等） */
const CJK_NOISE_PREFIX = /^[我你他她它这那其某就才又再还]/;

/**
 * 清理 CJK 短语：去除无意义前缀
 */
function cleanCjkPhrase(phrase: string): string {
    return phrase.replace(CJK_NOISE_PREFIX, '');
}

/**
 * 从标题中提取有意义的短语片段
 * 以标点符号和虚词（的/了/着/过等）为界进行切分，
 * 去除无意义前后缀和 @/# 噪声。
 * CJK 短语限制 2-8 个字符，英文短语限制 2-25 个字符。
 */
function extractPhrases(text: string): string[] {
    if (!text) return [];
    const normalized = normalizeText(text);
    const stripped = stripPunctuation(normalized);
    const phrases: string[] = [];
    const seen = new Set<string>();

    const addPhrase = (p: string) => {
        // 清理噪声前缀和标点
        let t = stripLeadingNoise(stripPunctuation(p.trim()));
        t = t.trim();
        if (t.length < 2 || seen.has(t)) return;
        // 按 CJK/英文 分别限制长度
        if (!isValidPhraseLength(t)) return;
        seen.add(t);
        phrases.push(t);
    };

    // 1. 按常见标题分隔符切割（括号、竖线、破折号等）
    const segments = normalized.split(/[【】\[\]()（）｜|—\-·《》「」『』]+/);
    for (const seg of segments) {
        const trimmed = stripPunctuation(seg.trim());
        if (trimmed.length >= 2) {
            addPhrase(trimmed);
        }
    }

    // 2. 从每个段中提取子短语：按标点和空格进一步切割
    for (const seg of segments) {
        const subParts = seg.split(/[,，。、；;：:！!？?\s]+/);
        for (const sub of subParts) {
            const trimmed = stripPunctuation(sub.trim());
            if (trimmed.length >= 2) {
                addPhrase(trimmed);
            }
        }
    }

    // 3. CJK 虚词边界切分：按 的/了/着/过 等虚词拆分，去除噪声前缀
    const cjkRuns = stripped.match(/[\u4E00-\u9FFF]{2,}/g);
    if (cjkRuns) {
        for (const run of cjkRuns) {
            const subPhrases = run.split(CJK_BOUNDARY_PATTERN).filter(Boolean);
            for (const sp of subPhrases) {
                const cleaned = cleanCjkPhrase(sp);
                if (cleaned.length >= 2 && cleaned.length <= 8) {
                    addPhrase(cleaned);
                }
            }
        }
    }

    // 4. 提取英文/字母数字短语（允许连字符和空格组成的多单词短语）
    const engRuns = stripped.match(/[a-z][a-z0-9]*(?:[\s-][a-z0-9]+)*/g);
    if (engRuns) {
        for (const run of engRuns) {
            if (run.length >= 2 && run.length <= 25) addPhrase(run);
        }
    }

    return phrases;
}

/**
 * 从文档中提取有意义的 token（用于共现分析）
 * 使用虚词边界切分，去除噪声，保留干净的短语 token。
 */
function extractDocTokens(text: string): string[] {
    if (!text) return [];
    const tokens: string[] = [];
    const seen = new Set<string>();

    const addToken = (t: string) => {
        let trimmed = stripLeadingNoise(stripPunctuation(t.trim())).toLowerCase();
        trimmed = trimmed.trim();
        if (trimmed.length < 2 || seen.has(trimmed)) return;
        if (!isValidPhraseLength(trimmed)) return;
        seen.add(trimmed);
        tokens.push(trimmed);
    };

    // 提取括号内容
    const bracketMatches = text.match(/[【\[（(]([^】\]）)]+)[】\]）)]/g);
    if (bracketMatches) {
        for (const m of bracketMatches) {
            const inner = m.slice(1, -1).trim();
            if (inner.length >= 2) addToken(inner);
        }
    }

    // 按分隔符切分
    const cleaned = text
        .replace(/<[^>]*>/g, '')
        .replace(/[【】\[\]()（）｜|—·《》「」『』,，。、；;：:！!？?]+/g, ' ');
    const parts = cleaned.split(/\s+/).filter(Boolean);

    for (const part of parts) {
        if (part.length < 2) continue;
        addToken(part);

        // 提取 CJK 子短语（虚词边界切分 + 噪声清理）
        const cjkRuns = part.match(/[\u4E00-\u9FFF]{2,}/g);
        if (cjkRuns) {
            for (const run of cjkRuns) {
                addToken(run);
                const subPhrases = run.split(CJK_BOUNDARY_PATTERN).filter(Boolean);
                for (const sp of subPhrases) {
                    const cjkCleaned = cleanCjkPhrase(sp);
                    if (cjkCleaned.length >= 2 && cjkCleaned.length <= 8) {
                        addToken(cjkCleaned);
                    }
                }
            }
        }

        // 提取英文/数字序列（允许连字符）
        const alphaRuns = part.match(/[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*/g);
        if (alphaRuns) {
            for (const run of alphaRuns) {
                addToken(run);
            }
        }
    }

    return tokens;
}

/**
 * 计算视频数据评分（用于 UP 主权重）
 * 综合考虑播放量、点赞、弹幕、收藏等数据
 */
function calculateVideoScore(hit: Record<string, unknown>): number {
    const view = (hit.view as number) || (hit.play as number) || 0;
    const like = (hit.like as number) || 0;
    const danmaku = (hit.danmaku as number) || (hit.video_review as number) || 0;
    const favorite = (hit.favorite as number) || (hit.favorites as number) || 0;
    const reply = (hit.reply as number) || 0;

    // 对数缩放，避免大数值主导
    return Math.log2(view + 1) * 2
        + Math.log2(like + 1) * 1.5
        + Math.log2(danmaku + 1) * 1
        + Math.log2(favorite + 1) * 1.5
        + Math.log2(reply + 1) * 0.5;
}

/**
 * 对文本进行高亮处理（支持拼音匹配高亮）
 */
function highlightMatch(text: string, query: string): string {
    if (!query) return escapeHtml(text);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // 1. 尝试直接文本匹配
    const positions: Array<[number, number]> = [];
    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerQuery, searchFrom);
        if (idx === -1) break;
        positions.push([idx, idx + lowerQuery.length]);
        searchFrom = idx + 1;
    }

    if (positions.length > 0) {
        return buildHighlightHtml(text, positions);
    }

    // 2. 尝试拼音匹配高亮（仅当查询可能是拼音时）
    if (isPossiblyPinyin(lowerQuery)) {
        const pinyinPositions = matchPinyinPositions(text, lowerQuery);
        if (pinyinPositions.length > 0) {
            return buildHighlightHtml(text, pinyinPositions);
        }
    }

    // 2b. 中文输入 → 拼音匹配高亮（如"李思维"匹配"李四维"）
    if (hasChinese(lowerQuery) && getPinyinSync()) {
        const queryPy = getPinyinInfo(lowerQuery);
        const fullQueryPy = queryPy.full.replace(/\s+/g, '');
        if (fullQueryPy.length >= 2) {
            const pinyinPositions = matchPinyinPositions(text, fullQueryPy);
            if (pinyinPositions.length > 0) {
                return buildHighlightHtml(text, pinyinPositions);
            }
        }
    }

    // 3. 尝试逐字匹配（子序列）
    const subsequencePositions: Array<[number, number]> = [];
    searchFrom = 0;
    for (let i = 0; i < lowerQuery.length; i++) {
        const charIdx = lowerText.indexOf(lowerQuery[i], searchFrom);
        if (charIdx === -1) {
            return escapeHtml(text);
        }
        subsequencePositions.push([charIdx, charIdx + 1]);
        searchFrom = charIdx + 1;
    }

    return buildHighlightHtml(text, subsequencePositions);
}

/**
 * 根据位置数组构建高亮 HTML
 */
function buildHighlightHtml(text: string, positions: Array<[number, number]>): string {
    let result = '';
    let lastEnd = 0;
    for (const [start, end] of positions) {
        if (start < lastEnd) continue;
        result += escapeHtml(text.slice(lastEnd, start));
        result += `<em class="suggest-highlight">${escapeHtml(text.slice(start, end))}</em>`;
        lastEnd = end;
    }
    result += escapeHtml(text.slice(lastEnd));
    return result;
}

/**
 * 拼音匹配定位：查找查询字符串在文本中通过拼音匹配到的字符位置
 *
 * 支持三种匹配方式：
 * - 首字母缩写匹配：如 "ysjf" → "影视飓风"
 * - 全拼前缀匹配：如 "yingshi" → "影视"
 * - 混合匹配：如 "yingsjf" → "影视飓风"
 *
 * @returns 匹配的字符位置数组 [start, end]
 */
function matchPinyinPositions(text: string, queryLower: string): Array<[number, number]> {
    const chars = Array.from(text);
    // 为每个字符生成拼音信息
    const charPinyins: Array<{ char: string; pinyin: string; initial: string; isChinese: boolean }> = [];

    // 收集连续中文段一起处理
    let chineseBuf = '';
    const flushChinese = () => {
        if (!chineseBuf) return;
        const pinyinLib = getPinyinSync();
        if (pinyinLib) {
            try {
                const tokens = pinyinLib.parse(chineseBuf);
                for (const token of tokens) {
                    if (token.type !== 2) {
                        continue;
                    }
                    const py = token.target.toLowerCase();
                    charPinyins.push({
                        char: token.source,
                        pinyin: py,
                        initial: py.charAt(0),
                        isChinese: true,
                    });
                }
            } catch {
            }
        }
        chineseBuf = '';
    };

    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const code = ch.charCodeAt(0);
        if (code >= 0x4E00 && code <= 0x9FFF) {
            chineseBuf += ch;
        } else {
            flushChinese();
            const lower = ch.toLowerCase();
            if (/[a-z0-9]/.test(lower)) {
                charPinyins.push({
                    char: ch,
                    pinyin: lower,
                    initial: lower,
                    isChinese: false,
                });
            } else {
                // 标点、空格等
                charPinyins.push({
                    char: ch,
                    pinyin: '',
                    initial: '',
                    isChinese: false,
                });
            }
        }
    }
    flushChinese();

    // 尝试从每个字符位置开始匹配
    for (let startCharIdx = 0; startCharIdx < charPinyins.length; startCharIdx++) {
        const positions = tryMatchFromPosition(charPinyins, startCharIdx, queryLower);
        if (positions.length > 0) {
            // 将 charPinyins 索引映射回原文本的字符索引
            // 由于使用 Array.from(text)，需要映射回字节偏移
            const result: Array<[number, number]> = [];
            let textOffset = 0;
            for (let ci = 0; ci < charPinyins.length; ci++) {
                const charLen = charPinyins[ci].char.length; // UTF-16 code unit count
                if (positions.includes(ci)) {
                    // 合并连续位置
                    const lastPos = result[result.length - 1];
                    if (lastPos && lastPos[1] === textOffset) {
                        lastPos[1] = textOffset + charLen;
                    } else {
                        result.push([textOffset, textOffset + charLen]);
                    }
                }
                textOffset += charLen;
            }
            return result;
        }
    }

    return [];
}

/**
 * 从指定位置开始，尝试用查询匹配文本字符的拼音
 * @returns 匹配到的字符索引数组
 */
function tryMatchFromPosition(
    charPinyins: Array<{ char: string; pinyin: string; initial: string; isChinese: boolean }>,
    startIdx: number,
    queryLower: string,
): number[] {
    let qi = 0; // query index
    const matchedIndices: number[] = [];

    for (let ci = startIdx; ci < charPinyins.length && qi < queryLower.length; ci++) {
        const cp = charPinyins[ci];
        if (!cp.pinyin) continue; // 跳过无拼音字符（标点等）

        if (cp.isChinese) {
            // 尝试匹配全拼（贪心匹配尽可能多的查询字符）
            let fullMatchLen = 0;
            for (let pi = 0; pi < cp.pinyin.length && qi + pi < queryLower.length; pi++) {
                if (cp.pinyin[pi] === queryLower[qi + pi]) {
                    fullMatchLen = pi + 1;
                } else {
                    break;
                }
            }

            if (fullMatchLen > 0) {
                matchedIndices.push(ci);
                qi += fullMatchLen;
            } else {
                // 如果未从此字符开始匹配到任何，跳出
                break;
            }
        } else {
            // 非中文字符：直接比对
            if (cp.pinyin === queryLower[qi]) {
                matchedIndices.push(ci);
                qi++;
            } else {
                break;
            }
        }
    }

    // 必须消耗完整个查询才算匹配成功
    if (qi === queryLower.length && matchedIndices.length > 0) {
        return matchedIndices;
    }
    return [];
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==================== 匹配算法 ====================

/**
 * 拼音匹配：支持首字母缩写、部分拼音、全拼
 *
 * 例子：
 * - "bz" → "b站" (首字母 b + z)
 * - "ysjf" → "影视飓风" (首字母 y+s+j+f)
 * - "yingsjf" → "影视飓风" (混合：ying + s + j + f)
 *
 * @returns 匹配分数，0 表示不匹配
 */
function matchPinyin(
    queryLower: string,
    entryPinyinFull: string,
    entryPinyinInitials: string,
): number {
    // 1. 首字母精确前缀
    if (entryPinyinInitials.startsWith(queryLower)) {
        const ratio = queryLower.length / entryPinyinInitials.length;
        return 55 + ratio * 10;
    }

    // 2. 首字母包含
    if (entryPinyinInitials.includes(queryLower)) {
        return 40;
    }

    // 3. 全拼前缀匹配（去掉空格）
    const fullNoSpace = entryPinyinFull.replace(/\s+/g, '');
    if (fullNoSpace.startsWith(queryLower)) {
        const ratio = queryLower.length / fullNoSpace.length;
        return 50 + ratio * 10;
    }

    // 4. 混合匹配：查询可能是全拼的前缀+首字母的后续
    //    如 "yingsjf" 匹配 full="ying shi ju feng", initials="ysjf"
    //    策略：尝试在 fullParts 中逐个音节匹配 query 字符
    const fullParts = entryPinyinFull.split(' ').filter(Boolean);
    let qi = 0; // query index
    let matchedSyllables = 0;
    for (const syllable of fullParts) {
        if (qi >= queryLower.length) break;
        // 尝试匹配整个音节或音节前缀
        let matchLen = 0;
        for (let si = 0; si < syllable.length && qi + si < queryLower.length; si++) {
            if (syllable[si] === queryLower[qi + si]) {
                matchLen = si + 1;
            } else {
                break;
            }
        }
        if (matchLen > 0) {
            qi += matchLen;
            matchedSyllables++;
        }
    }
    if (qi === queryLower.length && matchedSyllables >= 2) {
        const ratio = queryLower.length / fullNoSpace.length;
        return 45 + ratio * 10;
    }

    // 5. 全拼包含
    if (fullNoSpace.includes(queryLower)) {
        return 35;
    }

    return 0;
}

/**
 * 计算匹配分数
 * @returns 0-100 的分数，0 表示不匹配
 */
function calculateMatchScore(
    entry: IndexEntry,
    query: string,
    queryLower: string,
    queryIsPinyin: boolean,
    queryHasChinese: boolean,
): number {
    const { lower, type, weight } = entry;
    const entryPinyin = queryIsPinyin || queryHasChinese ? getEntryPinyinInfo(entry) : EMPTY_PINYIN_INFO;

    let score = 0;

    // 1. 精确匹配（最高分）
    if (lower === queryLower) {
        score = 100;
    }
    // 2. 前缀匹配
    else if (lower.startsWith(queryLower)) {
        score = 85 - Math.min(20, (lower.length - queryLower.length) * 0.5);
    }
    // 3. 包含匹配
    else if (lower.includes(queryLower)) {
        const idx = lower.indexOf(queryLower);
        score = 65 - Math.min(20, idx * 0.3);
    }
    // 4. 拼音匹配（仅当查询可能为拼音/字母时）
    else if (queryIsPinyin && entryPinyin?.initials) {
        score = matchPinyin(queryLower, entryPinyin.full, entryPinyin.initials);
    }
    // 4b. 中文输入 → 拼音匹配（如"李思维"匹配"李四维"）
    if (
        score === 0 &&
        queryHasChinese &&
        entryPinyin?.initials &&
        shouldUseChinesePhoneticFallback(entry, query)
    ) {
        const queryPy = getPinyinInfo(query);
        if (queryPy.initials.length >= 2) {
            // 尝试全拼匹配
            const fullQueryPy = queryPy.full.replace(/\s+/g, '');
            const pyScore = matchPinyin(fullQueryPy, entryPinyin.full, entryPinyin.initials);
            if (pyScore > 0) {
                // 中文→拼音匹配略低于直接拼音匹配
                score = Math.max(pyScore - 5, 30);
            }
            // 尝试首字母匹配
            if (score === 0) {
                const initialsScore = matchPinyin(queryPy.initials, entryPinyin.full, entryPinyin.initials);
                if (initialsScore > 0) {
                    score = Math.max(initialsScore - 8, 25);
                }
            }
        }
    }
    // 5. 多词匹配
    if (score === 0) {
        const queryWords = queryLower.split(/\s+/).filter(Boolean);
        if (queryWords.length > 1) {
            const allMatch = queryWords.every((w) => lower.includes(w));
            if (allMatch) {
                score = 50;
            }
        }
    }
    // 6. 子序列匹配
    if (score === 0 && queryLower.length >= 2) {
        let qi = 0;
        for (let ei = 0; ei < lower.length && qi < queryLower.length; ei++) {
            if (lower[ei] === queryLower[qi]) qi++;
        }
        if (qi === queryLower.length) {
            score = 25;
        }
    }

    if (score === 0) return 0;

    // 类型权重调整
    const typeBonus: Record<SuggestionType, number> = {
        history: 15,
        author: 12,
        tag: 10,
        phrase: 8,
        title: 5,
    };
    score += typeBonus[type] || 0;

    // 短文本加成：越短的匹配越精准（如UP主名称通常很短）
    if (lower.length <= 10 && score >= 25) {
        score += Math.max(0, 8 - lower.length);
    }

    // 频次/权重加成（最多 +10）
    score += Math.min(10, Math.log2(weight + 1) * 2);

    // 视频数据加成（仅 UP 主根据其视频的综合数据评分获得额外加分）
    if (type === 'author' && entry.videoScore && entry.videoScore > 0) {
        score += Math.min(15, entry.videoScore * 0.3);
    }

    // 时效性加成
    if (entry.timestamp) {
        const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
        if (ageHours < 1) score += 5;
        else if (ageHours < 24) score += 3;
        else if (ageHours < 168) score += 1;
    }

    return Math.max(0, score);
}

function shouldUseChinesePhoneticFallback(
    entry: IndexEntry,
    query: string,
): boolean {
    const queryLength = getTextLength(query);
    if (queryLength < 2 || queryLength > 4) {
        return false;
    }

    // 中文同音兜底更适合短历史和作者名，放到长标题/短语上会产生大量噪声召回。
    if (entry.type !== 'history' && entry.type !== 'author') {
        return false;
    }

    const entryLength = getTextLength(entry.text);
    return entryLength <= Math.max(queryLength + 2, 8);
}

// ==================== 主服务类 ====================

export class SmartSuggestService {
    /** 索引存储 */
    private index: IndexEntry[] = [];
    /** 文本去重集合 */
    private textSet: Set<string> = new Set();
    /** 共现词索引：token → 共同出现的其他 token 集合 */
    private coOccurrenceMap: Map<string, Map<string, number>> = new Map();
    /** 共现组合缓存 */
    private coOccurrenceCombos: CoOccurrenceEntry[] = [];
    /** UP 主累计视频数据评分 */
    private authorVideoScores: Map<string, number> = new Map();
    /** 最大索引条目数 */
    private maxIndexSize = 8000;
    /** 最大返回建议数 */
    private maxSuggestions = 12;

    constructor() {
        // 初始化
    }

    // ==================== 数据导入 ====================

    /**
     * 从搜索历史导入数据
     * 对相同 query 文本的多条记录进行合并，仅保留最新的一条
     */
    addFromHistory(items: Array<{
        query: string;
        timestamp: number;
        resultCount?: number;
        displayName?: string;
    }>): void {
        // 先按 query 去重，保留最新的记录
        const seen = new Map<string, typeof items[0]>();
        for (const item of items) {
            const key = (item.displayName || item.query).toLowerCase();
            const existing = seen.get(key);
            if (!existing || item.timestamp > existing.timestamp) {
                seen.set(key, item);
            }
        }

        for (const item of seen.values()) {
            const text = item.displayName || item.query;
            this.addEntry({
                text,
                lower: text.toLowerCase(),
                type: 'history',
                weight: 10 + (item.resultCount || 0) * 0.1,
                timestamp: item.timestamp,
                resultCount: item.resultCount,
            });
        }
        // 批量添加完成后一次性触发响应式更新
        suggestIndexVersion.value++;
    }

    /**
     * 从搜索结果导入数据
     */
    addFromSearchResults(hits: Array<Record<string, unknown>>): void {
        for (const hit of hits) {
            const title = (hit.title as string) || '';
            const bvid = (hit.bvid as string) || '';
            const owner = hit.owner as Record<string, unknown> | undefined;
            const ownerName = (owner?.name as string) || '';
            const ownerMid = owner?.mid as number | undefined;
            const tags = (hit.tags as string) || (hit.tag as string) || '';
            const desc = (hit.desc as string) || (hit.description as string) || '';

            // 计算该视频的数据评分
            const videoScore = calculateVideoScore(hit);

            // ---- 索引标题 ----
            if (title) {
                const normalized = normalizeText(title);
                this.addEntry({
                    text: normalized,
                    lower: normalized,
                    type: 'title',
                    weight: 5 + Math.min(5, videoScore * 0.1),
                    meta: bvid ? { bvid } : undefined,
                });
            }

            // ---- 索引 UP 主名称 ----
            if (ownerName) {
                const normalizedName = normalizeText(ownerName);
                // 累计该 UP 主的视频数据评分
                const prevScore = this.authorVideoScores.get(normalizedName) || 0;
                this.authorVideoScores.set(normalizedName, prevScore + videoScore);
                const totalVideoScore = prevScore + videoScore;

                this.addEntry({
                    text: ownerName,
                    lower: normalizedName,
                    type: 'author',
                    weight: 8 + Math.min(10, totalVideoScore * 0.2),
                    meta: ownerMid ? { uid: ownerMid } : undefined,
                    videoScore: totalVideoScore,
                });
                // 更新已有条目的 videoScore
                const existing = this.index.find(
                    (e) => e.type === 'author' && e.lower === normalizedName
                );
                if (existing) {
                    existing.videoScore = totalVideoScore;
                    existing.weight = Math.max(existing.weight, 8 + Math.min(10, totalVideoScore * 0.2));
                }
            }

            // ---- 索引标签（以半角逗号分隔，清除 @/# 噪声前缀） ----
            if (tags) {
                const tagList = tags.split(',')
                    .map((t: string) => stripLeadingNoise(stripPunctuation(t.trim())))
                    .filter((t: string) => t.length >= 2 && isValidPhraseLength(t));
                for (const tag of tagList) {
                    this.addEntry({
                        text: tag,
                        lower: tag.toLowerCase(),
                        type: 'tag',
                        weight: 3,
                    });
                }
            }

            // ---- 从标题中提取关键词（单词级别）----
            const normalizedTitle = title ? normalizeText(title) : '';
            const keywords = extractKeywords(title);
            for (const kw of keywords) {
                // 跳过与完整标题文本相同的关键词（避免与 title 条目重复）
                if (kw.toLowerCase() === normalizedTitle) continue;
                this.addEntry({
                    text: kw,
                    lower: kw.toLowerCase(),
                    type: 'phrase',
                    weight: 1,
                });
            }

            // ---- 从标题中提取有意义的短语（phrase 级别）----
            const phrases = extractPhrases(title);
            for (const phrase of phrases) {
                if (phrase === normalizeText(title)) continue;
                this.addEntry({
                    text: phrase,
                    lower: phrase.toLowerCase(),
                    type: 'phrase',
                    weight: 2,
                });
            }

            // ---- 共现分析：从文档的多个字段提取 token，建立共现关系 ----
            const docText = [title, tags, ownerName, desc].filter(Boolean).join(' ');
            const docTokens = extractDocTokens(docText);
            // 添加 UP 主名称作为 token（如果不在列表中）
            if (ownerName) {
                const ownerLower = ownerName.toLowerCase();
                if (!docTokens.includes(ownerLower)) {
                    docTokens.push(ownerLower);
                }
            }
            this.updateCoOccurrence(docTokens);
        }

        // 批量添加完成后生成共现推荐并触发响应式更新
        this.buildCoOccurrenceSuggestions();
        suggestIndexVersion.value++;
    }

    /**
     * 更新共现关系图
     */
    private updateCoOccurrence(tokens: string[]): void {
        // 只取前 15 个 token 避免过多组合
        const limited = tokens.slice(0, 15);
        for (let i = 0; i < limited.length; i++) {
            for (let j = i + 1; j < limited.length; j++) {
                const a = limited[i];
                const b = limited[j];
                // 跳过过短的 token 或完全包含关系
                if (a.length < 2 || b.length < 2) continue;
                if (a.includes(b) || b.includes(a)) continue;

                // a → b
                if (!this.coOccurrenceMap.has(a)) {
                    this.coOccurrenceMap.set(a, new Map());
                }
                const aMap = this.coOccurrenceMap.get(a);
                if (aMap) aMap.set(b, (aMap.get(b) || 0) + 1);

                // b → a
                if (!this.coOccurrenceMap.has(b)) {
                    this.coOccurrenceMap.set(b, new Map());
                }
                const bMap = this.coOccurrenceMap.get(b);
                if (bMap) bMap.set(a, (bMap.get(a) || 0) + 1);
            }
        }
    }

    /**
     * 从共现关系中构建组合建议
     */
    private buildCoOccurrenceSuggestions(): void {
        this.coOccurrenceCombos = [];
        const seen = new Set<string>();

        for (const [token, coMap] of this.coOccurrenceMap.entries()) {
            if (token.length < 2) continue;
            // 取共现次数最高的 top-5 搭配词（阈值 >= 2，避免偶然共现噪声）
            const sorted = [...coMap.entries()]
                .filter(([, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            for (const [partner, count] of sorted) {
                // 规范化 key 以去重（按字典序）
                const key = token < partner ? `${token}|${partner}` : `${partner}|${token}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const comboText = `${token} ${partner}`;
                if (comboText.length > 30) continue;

                this.coOccurrenceCombos.push({
                    text: comboText,
                    tokens: [token, partner],
                    count,
                });
            }
        }
    }

    /**
     * 跨文档多词组合补全：
     * 当用户输入包含多个词（空格分隔）时，将前面的词作为已确认词，
     * 最后一个词作为待补全前缀，从索引中查找匹配的补全项，
     * 然后将已确认词和补全结果组合成新的建议短语。
     *
     * 例如：用户输入 "donk ni"
     * - 已确认词: ["donk"]
     * - 待补全前缀: "ni"
     * - 从索引中找到 "niko" 匹配 "ni"
     * - 生成建议: "donk niko"
     */
    private addCrossDocCombinations(
        query: string,
        queryLower: string,
        scored: Array<{ entry: IndexEntry; score: number }>,
    ): void {
        const words = queryLower.split(/\s+/).filter(Boolean);
        if (words.length < 2) return;

        const confirmedWords = words.slice(0, -1);
        const lastWord = words[words.length - 1];

        if (!lastWord || lastWord.length < 1) return;

        // 验证已确认的词在索引中存在（至少能找到包含它的条目）
        const confirmedValid = confirmedWords.every((word) =>
            this.index.some((e) =>
                e.lower.includes(word) || e.lower === word
            )
        );
        if (!confirmedValid) return;

        const lastWordIsPinyin = isPossiblyPinyin(lastWord);
        const seenCombos = new Set<string>();

        // 在索引中查找 lastWord 的补全候选
        const completions: Array<{ text: string; score: number }> = [];
        for (const entry of this.index) {
            // 跳过历史类型（避免循环推荐自身历史）
            if (entry.type === 'history') continue;
            // 跳过已确认词本身
            if (confirmedWords.includes(entry.lower)) continue;

            let matchScore = 0;

            // 精确前缀匹配
            if (entry.lower.startsWith(lastWord)) {
                matchScore = 60 + (lastWord.length / entry.lower.length) * 20;
            }
            // 包含匹配
            else if (entry.lower.includes(lastWord)) {
                matchScore = 40;
            }
            // 拼音前缀匹配
            else if (lastWordIsPinyin) {
                const entryPinyin = getEntryPinyinInfo(entry);
                const pyScore = entryPinyin
                    ? matchPinyin(lastWord, entryPinyin.full, entryPinyin.initials)
                    : 0;
                if (pyScore > 0) {
                    matchScore = pyScore * 0.8;
                }
            }

            if (matchScore > 0) {
                completions.push({ text: entry.lower, score: matchScore });
            }
        }

        // 按匹配分排序，取 top completions
        completions.sort((a, b) => b.score - a.score);
        const topCompletions = completions.slice(0, 8);

        // 组合已确认词和补全词
        const confirmedStr = confirmedWords.join(' ');
        for (const comp of topCompletions) {
            const comboText = `${confirmedStr} ${comp.text}`;
            const comboLower = comboText.toLowerCase();

            // 去重：跳过已有的结果
            if (seenCombos.has(comboLower)) continue;
            seenCombos.add(comboLower);

            // 跳过与完整查询相同的组合
            if (comboLower === queryLower) continue;

            const syntheticEntry: IndexEntry = {
                text: comboText,
                lower: comboLower,
                type: 'phrase',
                weight: 3,
            };

            // 组合评分：基于 lastWord 匹配质量
            const comboScore = 30 + comp.score * 0.5;

            scored.push({ entry: syntheticEntry, score: comboScore });
        }
    }

    /**
     * 添加单条索引条目
     */
    private addEntry(entry: IndexEntry): void {
        const key = `${entry.type}:${entry.lower}`;
        if (this.textSet.has(key)) {
            const existing = this.index.find(
                (e) => e.type === entry.type && e.lower === entry.lower
            );
            if (existing) {
                existing.weight += entry.weight * 0.5;
                if (entry.timestamp && (!existing.timestamp || entry.timestamp > existing.timestamp)) {
                    existing.timestamp = entry.timestamp;
                }
                // 补充 meta
                if (entry.meta && !existing.meta) {
                    existing.meta = entry.meta;
                }
                // 合并 videoScore（取较大值）
                if (entry.videoScore && (!existing.videoScore || entry.videoScore > existing.videoScore)) {
                    existing.videoScore = entry.videoScore;
                }
            }
            return;
        }

        this.textSet.add(key);
        this.index.push(entry);

        if (this.index.length > this.maxIndexSize) {
            this.pruneIndex();
        }
    }

    /**
     * 裁剪索引
     */
    private pruneIndex(): void {
        this.index.sort((a, b) => b.weight - a.weight);
        const removed = this.index.splice(Math.floor(this.maxIndexSize * 0.8));
        for (const entry of removed) {
            this.textSet.delete(`${entry.type}:${entry.lower}`);
        }
    }

    // ==================== 查询接口 ====================

    /**
     * 根据用户输入获取智能建议
     */
    suggest(query: string): SmartSuggestion[] {
        if (!query || query.trim() === '') return [];

        const trimmed = query.trim();
        const queryLower = trimmed.toLowerCase();
        const queryIsPinyin = isPossiblyPinyin(queryLower);
        const queryHasChinese = hasChinese(trimmed);

        if (queryIsPinyin) {
            requestPinyinLoad();
        }

        const scored: Array<{ entry: IndexEntry; score: number }> = [];

        for (const entry of this.index) {
            const score = calculateMatchScore(entry, trimmed, queryLower, queryIsPinyin, queryHasChinese);
            if (score > 0) {
                scored.push({ entry, score });
            }
        }

        if (scored.length === 0 && queryHasChinese) {
            requestPinyinLoad();
        }

        // 共现组合匹配：当用户输入匹配某个 token 时，推荐该 token 的共现组合
        for (const combo of this.coOccurrenceCombos) {
            const comboLower = combo.text.toLowerCase();
            // 只在用户本身就在输入该 token 时触发共现补全，
            // 避免长句中偶然包含某个词就放大成一串无关短语。
            const matchesToken = combo.tokens.some((t) =>
                t.includes(queryLower)
            );
            if (!matchesToken && !comboLower.includes(queryLower)) continue;

            // 避免推荐与查询完全相同的组合
            if (comboLower === queryLower) continue;

            const syntheticEntry: IndexEntry = {
                text: combo.text,
                lower: comboLower,
                type: 'phrase',
                weight: 2 + combo.count * 0.5,
            };

            // 给共现组合一个基础分
            let comboScore = 35 + Math.min(15, combo.count * 3);
            // 若 token 精确匹配则加分
            if (combo.tokens.some((t) => t === queryLower)) {
                comboScore += 15;
            }

            scored.push({ entry: syntheticEntry, score: comboScore });
        }

        // 跨文档多词组合补全：当用户输入多个空格分隔的词时，
        // 尝试将每个词分别匹配索引条目，把最后一个词作为前缀进行补全，
        // 然后组合成新的建议短语
        this.addCrossDocCombinations(trimmed, queryLower, scored);

        scored.sort((a, b) => b.score - a.score);

        // 构建历史文本集，用于将 tag/phrase 提升为 history 类型
        const historyTexts = new Set<string>();
        for (const entry of this.index) {
            if (entry.type === 'history') {
                historyTexts.add(entry.lower);
            }
        }

        // 去重逻辑：
        // - history/tag/phrase（文本搜索类型）：按文本去重，若与历史重复则提升为 history
        // - title（视频）：单独去重，允许与文本搜索类型共存
        // - author（UP主）：单独去重
        const textSearchSeen = new Set<string>();
        const titleSeen = new Set<string>();
        const authorSeen = new Set<string>();
        const unique: SmartSuggestion[] = [];

        for (const { entry, score } of scored) {
            const { type, lower } = entry;

            if (type === 'history' || type === 'tag' || type === 'phrase') {
                if (textSearchSeen.has(lower)) continue;
                textSearchSeen.add(lower);
                // tag/phrase 与历史文本重复时提升为 history 类型
                let displayType: SuggestionType = type;
                if ((type === 'tag' || type === 'phrase') && historyTexts.has(lower)) {
                    displayType = 'history';
                }
                unique.push({
                    text: entry.text,
                    type: displayType,
                    score: displayType === 'history' && type !== 'history' ? score + 10 : score,
                    highlightedText: highlightMatch(entry.text, trimmed),
                    meta: entry.meta,
                    source: entry.source,
                    timestamp: entry.timestamp,
                    resultCount: entry.resultCount,
                });
            } else if (type === 'title') {
                if (titleSeen.has(lower)) continue;
                titleSeen.add(lower);
                unique.push({
                    text: entry.text,
                    type: 'title',
                    score,
                    highlightedText: highlightMatch(entry.text, trimmed),
                    meta: entry.meta,
                    source: entry.source,
                    timestamp: entry.timestamp,
                    resultCount: entry.resultCount,
                });
            } else if (type === 'author') {
                if (authorSeen.has(lower)) continue;
                authorSeen.add(lower);
                unique.push({
                    text: entry.text,
                    type: 'author',
                    score,
                    highlightedText: highlightMatch(entry.text, trimmed),
                    meta: entry.meta,
                    source: entry.source,
                    timestamp: entry.timestamp,
                    resultCount: entry.resultCount,
                });
            }

            if (unique.length >= this.maxSuggestions) break;
        }

        // 最终排序：确保 promoted-to-history 的条目排在正确位置
        unique.sort((a, b) => b.score - a.score);

        return unique;
    }

    /**
     * 获取搜索历史建议（无输入时使用）
     */
    getRecentHistory(limit = 10): SmartSuggestion[] {
        const seen = new Set<string>();
        return this.index
            .filter((e) => e.type === 'history')
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .filter((entry) => {
                if (seen.has(entry.lower)) return false;
                seen.add(entry.lower);
                return true;
            })
            .slice(0, limit)
            .map((entry) => ({
                text: entry.text,
                type: 'history' as SuggestionType,
                score: 100,
                highlightedText: escapeHtml(entry.text),
                source: entry.source,
                timestamp: entry.timestamp,
                resultCount: entry.resultCount,
            }));
    }

    /**
     * 清空索引
     */
    clear(): void {
        this.index = [];
        this.textSet.clear();
        this.coOccurrenceMap.clear();
        this.coOccurrenceCombos = [];
        this.authorVideoScores.clear();
        pinyinCache.clear();
    }

    /**
     * 仅清空 history 类型索引（保留 title/author/tag/phrase）
     * 用于输入记录变更后增量同步建议索引
     */
    clearHistoryEntries(): void {
        const prevSize = this.index.length;
        this.index = this.index.filter((entry) => entry.type !== 'history');
        if (this.index.length === prevSize) return;

        // 重建文本集合，确保去重状态与当前索引一致
        this.textSet.clear();
        for (const entry of this.index) {
            this.textSet.add(entry.lower);
        }
        suggestIndexVersion.value++;
    }

    /**
     * 获取当前索引大小
     */
    getSize(): number {
        return this.index.length;
    }
}

/** 全局单例 */
let instance: SmartSuggestService | null = null;

/**
 * 获取 SmartSuggestService 单例
 */
export function getSmartSuggestService(): SmartSuggestService {
    if (!instance) {
        instance = new SmartSuggestService();
    }
    return instance;
}
