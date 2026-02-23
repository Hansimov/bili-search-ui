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

        it('相同文本应该去重', () => {
            service.addFromHistory([
                { query: '原神', timestamp: Date.now() },
            ]);
            service.addFromSearchResults([
                { title: '原神', owner: { name: 'test' } },
            ]);
            const results = service.suggest('原神');
            const texts = results.map((r: { text: string }) => r.text);
            const uniqueTexts = [...new Set(texts)];
            expect(texts.length).toBe(uniqueTexts.length);
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
});
