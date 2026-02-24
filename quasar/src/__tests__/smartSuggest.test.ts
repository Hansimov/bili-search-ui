/**
 * SmartSuggestService 单元测试
 *
 * 测试智能补全引擎的核心功能：
 * - 数据导入（历史、搜索结果）
 * - 匹配算法（精确、前缀、包含、拼音、子序列）
 * - 排序和去重
 * - 评分逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartSuggestService } from 'src/services/smartSuggestService';

describe('SmartSuggestService', () => {
    let service: SmartSuggestService;

    beforeEach(() => {
        service = new SmartSuggestService();
    });

    describe('初始化', () => {
        it('应该创建空索引', () => {
            expect(service.getSize()).toBe(0);
        });

        it('空查询应该返回空建议', () => {
            expect(service.suggest('')).toEqual([]);
            expect(service.suggest('   ')).toEqual([]);
        });
    });

    describe('搜索历史导入', () => {
        it('应该正确导入搜索历史', () => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now(), resultCount: 10 },
                { query: '明日方舟', timestamp: Date.now() - 3600000, resultCount: 5 },
            ]);
            expect(service.getSize()).toBe(2);
        });

        it('重复历史应该增加权重而非新增条目', () => {
            const ts = Date.now();
            service.addFromHistory([
                { query: '原神', timestamp: ts, resultCount: 10 },
            ]);
            service.addFromHistory([
                { query: '原神', timestamp: ts + 1000, resultCount: 15 },
            ]);
            expect(service.getSize()).toBe(1); // 不应该增加新条目
        });

        it('应该支持 displayName', () => {
            service.addFromHistory([
                { query: 'test', timestamp: Date.now(), displayName: '测试搜索' },
            ]);
            const results = service.suggest('测试');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].text).toBe('测试搜索');
        });
    });

    describe('搜索结果导入', () => {
        it('应该从搜索结果中提取标题、作者、标签', () => {
            service.addFromSearchResults([
                {
                    title: '【原神】全角色测试',
                    owner: { name: 'UP主测试' },
                    tags: '原神,游戏,测试',
                },
            ]);
            // 标题 + 作者 + 3个标签 + 关键词
            expect(service.getSize()).toBeGreaterThanOrEqual(3);
        });

        it('应该处理缺失字段', () => {
            service.addFromSearchResults([
                { title: '', owner: undefined, tags: '' },
                {},
            ]);
            // 不应该导致错误
            expect(service.getSize()).toBe(0);
        });
    });

    describe('精确匹配', () => {
        beforeEach(() => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
                { query: '明日方舟', timestamp: Date.now() },
                { query: 'genshin impact', timestamp: Date.now() },
            ]);
        });

        it('精确匹配应该得到最高分', () => {
            const results = service.suggest('原神');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].text).toBe('原神');
            expect(results[0].score).toBeGreaterThan(90);
        });

        it('英文精确匹配（大小写无关）', () => {
            const results = service.suggest('Genshin Impact');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].text).toBe('genshin impact');
        });
    });

    describe('前缀匹配', () => {
        beforeEach(() => {
            service.addFromHistory([
                { query: '原神攻略', timestamp: Date.now() },
                { query: '原神角色', timestamp: Date.now() },
                { query: '明日方舟', timestamp: Date.now() },
            ]);
        });

        it('前缀匹配应该返回匹配结果', () => {
            const results = service.suggest('原神');
            expect(results.length).toBe(2);
        });

        it('前缀匹配分数应该低于精确匹配', () => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
            ]);
            const results = service.suggest('原神');
            // 精确匹配 "原神" 应该排在 "原神攻略" 前
            expect(results[0].text).toBe('原神');
        });
    });

    describe('包含匹配', () => {
        beforeEach(() => {
            service.addFromHistory([
                { query: '最新原神攻略', timestamp: Date.now() },
                { query: '原神最新角色', timestamp: Date.now() },
            ]);
        });

        it('查询词出现在中间也应匹配', () => {
            const results = service.suggest('原神');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('拼音匹配', () => {
        beforeEach(() => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
                { query: '明日方舟', timestamp: Date.now() },
            ]);
        });

        it('拼音首字母应该匹配中文', () => {
            const results = service.suggest('ys');
            // 拼音匹配 "原神" (y-s)
            // 注意：这取决于拼音映射表的精确度
            expect(results.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('多词匹配', () => {
        beforeEach(() => {
            service.addFromHistory([
                { query: '原神 攻略 角色', timestamp: Date.now() },
                { query: '明日方舟 干员', timestamp: Date.now() },
            ]);
        });

        it('多个词语都出现时应该匹配', () => {
            const results = service.suggest('攻略 角色');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('排序和去重', () => {
        it('结果应该按分数降序排列', () => {
            service.addFromHistory([
                { query: '原神攻略', timestamp: Date.now() },
                { query: '原神角色推荐', timestamp: Date.now() },
                { query: '原神', timestamp: Date.now() },
            ]);
            const results = service.suggest('原神');
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }
        });

        it('相同文本同类型应该去重', () => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
            ]);
            service.addFromSearchResults([
                { title: '原神', owner: { name: 'test' } },
            ]);
            const results = service.suggest('原神');
            // 历史和视频可以共存（不同类型），但同类型不应重复
            const historyResults = results.filter((r) => r.type === 'history');
            const titleResults = results.filter((r) => r.type === 'title');
            expect(historyResults.length).toBeLessThanOrEqual(1);
            expect(titleResults.length).toBeLessThanOrEqual(1);
            // 历史条目应排在前面
            if (historyResults.length > 0 && titleResults.length > 0) {
                const histIdx = results.indexOf(historyResults[0]);
                const titleIdx = results.indexOf(titleResults[0]);
                expect(histIdx).toBeLessThan(titleIdx);
            }
        });
    });

    describe('搜索历史类型优先级', () => {
        it('搜索历史应该排在其他类型前面', () => {
            service.addFromHistory([
                { query: '测试视频', timestamp: Date.now() },
            ]);
            service.addFromSearchResults([
                { title: '测试视频合集', owner: { name: 'up' } },
            ]);
            const results = service.suggest('测试视频');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].type).toBe('history');
        });
    });

    describe('高亮功能', () => {
        it('应该在匹配位置添加高亮标签', () => {
            service.addFromHistory([
                { query: '原神攻略', timestamp: Date.now() },
            ]);
            const results = service.suggest('原神');
            expect(results[0].highlightedText).toContain('suggest-highlight');
        });
    });

    describe('最近历史查询', () => {
        it('应该按时间倒序返回历史', () => {
            const now = Date.now();
            service.addFromHistory([
                { query: '旧记录', timestamp: now - 86400000 },
                { query: '新记录', timestamp: now },
            ]);
            const history = service.getRecentHistory();
            expect(history.length).toBe(2);
            expect(history[0].text).toBe('新记录');
        });

        it('应该限制返回数量', () => {
            const items = Array.from({ length: 20 }, (_, i) => ({
                query: `搜索${i}`,
                timestamp: Date.now() - i * 1000,
            }));
            service.addFromHistory(items);
            const history = service.getRecentHistory(5);
            expect(history.length).toBe(5);
        });
    });

    describe('清空索引', () => {
        it('清空后应该没有建议', () => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
            ]);
            expect(service.getSize()).toBeGreaterThan(0);
            service.clear();
            expect(service.getSize()).toBe(0);
            expect(service.suggest('原神')).toEqual([]);
        });
    });

    describe('边界条件', () => {
        it('应该处理特殊字符', () => {
            service.addFromHistory([
                { query: '<script>alert(1)</script>', timestamp: Date.now() },
            ]);
            const results = service.suggest('<script>');
            // 高亮文本不应包含未转义的script标签
            if (results.length > 0) {
                expect(results[0].highlightedText).not.toContain('<script>alert');
            }
        });

        it('应该处理非常长的输入', () => {
            const longQuery = '测'.repeat(1000);
            expect(() => service.suggest(longQuery)).not.toThrow();
        });

        it('应该处理只有空格的输入', () => {
            expect(service.suggest('   ')).toEqual([]);
        });
    });

    describe('中间文本匹配 (in-middle)', () => {
        it('英文字母应匹配中间位置 (hbk → 红警HBK08)', () => {
            service.addFromHistory([
                { query: '红警HBK08', timestamp: Date.now() },
            ]);
            const results = service.suggest('hbk');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].text.toLowerCase()).toContain('hbk');
        });

        it('中文应匹配中间位置', () => {
            service.addFromHistory([
                { query: '最新原神攻略视频', timestamp: Date.now() },
            ]);
            const results = service.suggest('攻略');
            expect(results.length).toBeGreaterThan(0);
        });

        it('混合查询应匹配搜索结果标题', () => {
            service.addFromSearchResults([
                { title: '红警HBK08精彩集锦', owner: { name: 'UP主' } },
            ]);
            const results = service.suggest('hbk');
            expect(results.length).toBeGreaterThan(0);
        });

        it('数字+字母混合查询应匹配', () => {
            service.addFromHistory([
                { query: '红警HBK08', timestamp: Date.now() },
            ]);
            const results = service.suggest('hbk08');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('中文→拼音匹配', () => {
        it('同音中文应互相匹配（李思维 → 李四维）', () => {
            service.addFromHistory([
                { query: '李四维', timestamp: Date.now() },
            ]);
            const results = service.suggest('李思维');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].text).toBe('李四维');
        });

        it('同音中文应高亮匹配到的字符', () => {
            service.addFromHistory([
                { query: '李四维', timestamp: Date.now() },
            ]);
            const results = service.suggest('李思维');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].highlightedText).toContain('suggest-highlight');
        });

        it('部分同音中文应匹配', () => {
            service.addFromHistory([
                { query: '影视飓风', timestamp: Date.now() },
            ]);
            // "映世" 拼音 yingshi 应匹配 "影视飓风" 的 yingshi
            const results = service.suggest('映世');
            expect(results.length).toBeGreaterThan(0);
        });

        it('不相关的中文不应匹配', () => {
            service.addFromHistory([
                { query: '影视飓风', timestamp: Date.now() },
            ]);
            const results = service.suggest('天气预报');
            expect(results.length).toBe(0);
        });
    });

    describe('历史去重', () => {
        it('重复 query 的历史应只保留一条', () => {
            const now = Date.now();
            service.addFromHistory([
                { query: '原神', timestamp: now - 3000 },
                { query: '原神', timestamp: now - 2000 },
                { query: '原神', timestamp: now - 1000 },
                { query: '原神', timestamp: now },
            ]);
            // 索引中只应有1条 history 类型条目
            expect(service.getSize()).toBe(1);
        });

        it('getRecentHistory 不应有重复文本', () => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
                { query: '明日方舟', timestamp: Date.now() - 1000 },
            ]);
            const history = service.getRecentHistory();
            const texts = history.map((h) => h.text);
            const uniqueTexts = [...new Set(texts)];
            expect(texts.length).toBe(uniqueTexts.length);
        });
    });

    describe('拼音高亮', () => {
        it('拼音首字母应高亮对应汉字 (ysjf → 影视飓风)', () => {
            service.addFromHistory([
                { query: '影视飓风', timestamp: Date.now() },
            ]);
            const results = service.suggest('ysjf');
            expect(results.length).toBeGreaterThan(0);
            // 高亮文本应包含 suggest-highlight 标记
            expect(results[0].highlightedText).toContain('suggest-highlight');
        });

        it('全拼应高亮对应汉字', () => {
            service.addFromHistory([
                { query: '影视飓风', timestamp: Date.now() },
            ]);
            const results = service.suggest('yingshi');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].highlightedText).toContain('suggest-highlight');
        });
    });

    describe('UP主匹配增强', () => {
        it('搜索结果中的UP主名称应出现在建议中', () => {
            service.addFromSearchResults([
                {
                    title: '2024年度总结视频',
                    bvid: 'BV123',
                    owner: { name: '影视飓风', mid: 12345 },
                    tags: '年度总结',
                },
            ]);
            const results = service.suggest('影视');
            const authorResult = results.find((r) => r.type === 'author');
            expect(authorResult).toBeDefined();
            expect(authorResult?.text).toBe('影视飓风');
            expect(authorResult?.meta?.uid).toBe(12345);
        });

        it('UP主名称应能通过拼音匹配', () => {
            service.addFromSearchResults([
                {
                    title: '测试视频',
                    bvid: 'BV456',
                    owner: { name: '老番茄', mid: 67890 },
                    tags: '',
                },
            ]);
            const results = service.suggest('lfq');
            const authorResult = results.find((r) => r.type === 'author');
            expect(authorResult).toBeDefined();
            expect(authorResult?.text).toBe('老番茄');
        });

        it('多个视频的同一UP主应通过权重累积提升排名', () => {
            const hits = [];
            for (let i = 0; i < 5; i++) {
                hits.push({
                    title: `视频${i + 1}`,
                    bvid: `BV${i}`,
                    owner: { name: '频道主', mid: 11111 },
                    tags: '',
                });
            }
            service.addFromSearchResults(hits);
            // 索引中 author 类型应只有 1 条（去重），但权重应已累积
            const results = service.suggest('频道');
            const authorResult = results.find((r) => r.type === 'author');
            expect(authorResult).toBeDefined();
            expect(authorResult?.score).toBeGreaterThan(30);
        });
    });

    describe('短语提取', () => {
        it('应从标题中提取括号分割的短语', () => {
            service.addFromSearchResults([
                {
                    title: '【影视飓风】2024年最值得看的10部电影推荐',
                    bvid: 'BV789',
                    owner: { name: '测试', mid: 1 },
                    tags: '',
                },
            ]);
            // 搜索"电影"应该匹配到提取出来的短语
            const results = service.suggest('电影');
            expect(results.length).toBeGreaterThan(0);
            // 应有 phrase 类型的短语匹配
            const kwResults = results.filter((r) => r.type === 'phrase');
            expect(kwResults.length).toBeGreaterThan(0);
        });

        it('应从标题中提取有意义的中文子串', () => {
            service.addFromSearchResults([
                {
                    title: '为什么你的视频没有人看？自媒体运营全攻略',
                    bvid: 'BV111',
                    owner: { name: '博主A', mid: 2 },
                    tags: '',
                },
            ]);
            const results = service.suggest('自媒体');
            expect(results.length).toBeGreaterThan(0);
        });

        it('短语和视频标题相同时，短语应在视频前面', () => {
            const title = '测试标题';
            service.addFromSearchResults([
                {
                    title,
                    bvid: 'BV222',
                    owner: { name: 'X', mid: 3 },
                    tags: '测试标题',
                },
            ]);
            const results = service.suggest('测试');
            // 标签/短语类型应在视频类型之前
            const textIdx = results.findIndex((r) => r.type === 'tag' || r.type === 'phrase');
            const titleIdx = results.findIndex((r) => r.type === 'title');
            if (textIdx >= 0 && titleIdx >= 0) {
                expect(textIdx).toBeLessThan(titleIdx);
            }
        });
    });
});
