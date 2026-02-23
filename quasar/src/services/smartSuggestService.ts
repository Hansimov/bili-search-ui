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
 * 使用 hotoo/pinyin 库实现精准的中文拼音转换。
 */

import { pinyin } from 'pinyin';

/** 建议类型，对应前端三种行为：文本/视频/用户 */
export type SuggestionType = 'history' | 'title' | 'author' | 'tag' | 'keyword';

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
    pinyinFull: string;
    /** 拼音首字母：如 "ysjf" */
    pinyinInitials: string;
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
}

// ==================== 拼音工具 ====================

/** 缓存：text → { full, initials } */
const pinyinCache = new Map<string, { full: string; initials: string }>();

/**
 * 获取文本的拼音信息（全拼 + 首字母）
 * 使用 hotoo/pinyin 库，支持多音字智能选择
 */
function getPinyinInfo(text: string): { full: string; initials: string } {
    if (!text) return { full: '', initials: '' };

    const cached = pinyinCache.get(text);
    if (cached) return cached;

    // 分字处理：中文用 pinyin 库，非中文保留原样
    const chars = Array.from(text);
    const fullParts: string[] = [];
    const initialParts: string[] = [];

    // 收集连续中文段一起处理，利用 pinyin 库的词组智能选择
    let chineseBuf = '';
    const flushChinese = () => {
        if (!chineseBuf) return;
        try {
            const result = pinyin(chineseBuf, { style: 'normal' });
            for (const py of result) {
                const p = py[0] || '';
                fullParts.push(p);
                initialParts.push(p.charAt(0));
            }
        } catch {
            // fallback: treat each char as-is
            for (const c of Array.from(chineseBuf)) {
                fullParts.push(c.toLowerCase());
                initialParts.push(c.toLowerCase());
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

/**
 * 检测输入是否可能为拼音/英文字母（允许数字混合）
 */
function isPossiblyPinyin(input: string): boolean {
    // 至少包含一个字母，且只由字母和数字组成
    return /^[a-z0-9]+$/.test(input) && /[a-z]/.test(input) && input.length >= 1;
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
 * 提取文本中的关键词
 */
function extractKeywords(text: string): string[] {
    if (!text) return [];
    const normalized = normalizeText(text);
    const words = normalized.split(/[\s,，。、；;：:！!？?·\-_|/\\]+/);
    return words.filter((w) => w.length >= 2);
}

/**
 * 对文本进行高亮处理
 */
function highlightMatch(text: string, query: string): string {
    if (!query) return escapeHtml(text);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // 查找所有匹配位置
    const positions: Array<[number, number]> = [];
    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerQuery, searchFrom);
        if (idx === -1) break;
        positions.push([idx, idx + lowerQuery.length]);
        searchFrom = idx + 1;
    }

    if (positions.length === 0) {
        // 尝试逐字匹配
        searchFrom = 0;
        for (let i = 0; i < lowerQuery.length; i++) {
            const charIdx = lowerText.indexOf(lowerQuery[i], searchFrom);
            if (charIdx !== -1) {
                positions.push([charIdx, charIdx + 1]);
                searchFrom = charIdx + 1;
            }
        }
    }

    if (positions.length === 0) return escapeHtml(text);

    // 构建高亮 HTML
    let result = '';
    let lastEnd = 0;
    for (const [start, end] of positions) {
        if (start < lastEnd) continue; // skip overlapping
        result += escapeHtml(text.slice(lastEnd, start));
        result += `<em class="suggest-highlight">${escapeHtml(text.slice(start, end))}</em>`;
        lastEnd = end;
    }
    result += escapeHtml(text.slice(lastEnd));
    return result;
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
): number {
    const { lower, type, weight } = entry;

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
    else if (queryIsPinyin && entry.pinyinInitials) {
        score = matchPinyin(queryLower, entry.pinyinFull, entry.pinyinInitials);
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
        author: 10,
        title: 8,
        tag: 6,
        keyword: 4,
    };
    score += typeBonus[type] || 0;

    // 频次/权重加成（最多 +10）
    score += Math.min(10, Math.log2(weight + 1) * 2);

    // 时效性加成
    if (entry.timestamp) {
        const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
        if (ageHours < 1) score += 5;
        else if (ageHours < 24) score += 3;
        else if (ageHours < 168) score += 1;
    }

    return Math.max(0, score);
}

// ==================== 主服务类 ====================

export class SmartSuggestService {
    /** 索引存储 */
    private index: IndexEntry[] = [];
    /** 文本去重集合 */
    private textSet: Set<string> = new Set();
    /** 最大索引条目数 */
    private maxIndexSize = 5000;
    /** 最大返回建议数 */
    private maxSuggestions = 12;

    constructor() {
        // 初始化
    }

    // ==================== 数据导入 ====================

    /**
     * 从搜索历史导入数据
     */
    addFromHistory(items: Array<{
        query: string;
        timestamp: number;
        resultCount?: number;
        displayName?: string;
    }>): void {
        for (const item of items) {
            const text = item.displayName || item.query;
            const py = getPinyinInfo(text);
            this.addEntry({
                text,
                lower: text.toLowerCase(),
                pinyinFull: py.full,
                pinyinInitials: py.initials,
                type: 'history',
                weight: 10 + (item.resultCount || 0) * 0.1,
                timestamp: item.timestamp,
                resultCount: item.resultCount,
            });
        }
    }

    /**
     * 从搜索结果导入数据
     */
    addFromSearchResults(hits: Array<Record<string, unknown>>): void {
        for (const hit of hits) {
            // 索引标题
            const title = (hit.title as string) || '';
            const bvid = (hit.bvid as string) || '';
            if (title) {
                const normalized = normalizeText(title);
                const py = getPinyinInfo(normalized);
                this.addEntry({
                    text: normalized,
                    lower: normalized,
                    pinyinFull: py.full,
                    pinyinInitials: py.initials,
                    type: 'title',
                    weight: 5,
                    meta: bvid ? { bvid } : undefined,
                });
            }

            // 索引 UP 主名称
            const owner = hit.owner as Record<string, unknown> | undefined;
            const ownerName = (owner?.name as string) || '';
            const ownerMid = owner?.mid as number | undefined;
            if (ownerName) {
                const py = getPinyinInfo(ownerName);
                this.addEntry({
                    text: ownerName,
                    lower: ownerName.toLowerCase(),
                    pinyinFull: py.full,
                    pinyinInitials: py.initials,
                    type: 'author',
                    weight: 3,
                    meta: ownerMid ? { uid: ownerMid } : undefined,
                });
            }

            // 索引标签
            const tags = (hit.tags as string) || (hit.tag as string) || '';
            if (tags) {
                const tagList = tags.split(/[,，\s]+/).filter((t: string) => t.length >= 2);
                for (const tag of tagList) {
                    const py = getPinyinInfo(tag);
                    this.addEntry({
                        text: tag,
                        lower: tag.toLowerCase(),
                        pinyinFull: py.full,
                        pinyinInitials: py.initials,
                        type: 'tag',
                        weight: 2,
                    });
                }
            }

            // 从标题中提取关键词
            const keywords = extractKeywords(title);
            for (const kw of keywords) {
                const py = getPinyinInfo(kw);
                this.addEntry({
                    text: kw,
                    lower: kw.toLowerCase(),
                    pinyinFull: py.full,
                    pinyinInitials: py.initials,
                    type: 'keyword',
                    weight: 1,
                });
            }
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

        const scored: Array<{ entry: IndexEntry; score: number }> = [];

        for (const entry of this.index) {
            const score = calculateMatchScore(entry, trimmed, queryLower, queryIsPinyin);
            if (score > 0) {
                scored.push({ entry, score });
            }
        }

        scored.sort((a, b) => b.score - a.score);

        const seen = new Set<string>();
        const unique: SmartSuggestion[] = [];

        for (const { entry, score } of scored) {
            const dedupeKey = entry.lower;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            unique.push({
                text: entry.text,
                type: entry.type,
                score,
                highlightedText: highlightMatch(entry.text, trimmed),
                meta: entry.meta,
                source: entry.source,
                timestamp: entry.timestamp,
                resultCount: entry.resultCount,
            });

            if (unique.length >= this.maxSuggestions) break;
        }

        return unique;
    }

    /**
     * 获取搜索历史建议（无输入时使用）
     */
    getRecentHistory(limit = 10): SmartSuggestion[] {
        return this.index
            .filter((e) => e.type === 'history')
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
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
        pinyinCache.clear();
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
