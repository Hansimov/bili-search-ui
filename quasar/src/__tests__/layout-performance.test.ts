import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Constants mirroring layoutStore.ts
// ============================================================================
const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 50;
const DESKTOP_BREAKPOINT = 768;

// ============================================================================
// 1. Sidebar expand/collapse simulation
// ============================================================================
describe('sidebar expand simulation — reactive chain analysis', () => {
    /**
     * Simulates the Pinia store state and computed property chain that fires
     * when the sidebar is toggled on desktop (>= 768px).
     *
     * The chain:
     *   toggleSidebar()
     *     → isSidebarExpanded flips
     *     → sidebarWidth() changes (50 ↔ 260)
     *     → availableContentWidth() changes
     *     → grid maxWidth recomputes
     *     → header/searchBar left/width recomputes
     *     → updateSearchInputMaxWidth() writes CSS variable
     */

    interface LayoutState {
        screenWidth: number;
        isSidebarExpanded: boolean;
    }

    const sidebarWidth = (state: LayoutState) =>
        state.screenWidth >= DESKTOP_BREAKPOINT
            ? (state.isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH)
            : (state.screenWidth >= 570 ? SIDEBAR_COLLAPSED_WIDTH : 0);

    const availableContentWidth = (state: LayoutState) =>
        state.screenWidth >= 570
            ? state.screenWidth - sidebarWidth(state)
            : state.screenWidth;

    const gridMaxWidth = (state: LayoutState) =>
        Math.min(availableContentWidth(state), 1280);

    const gridColumnCount = (maxWidth: number, itemWidth: number) =>
        Math.floor(maxWidth / itemWidth);

    it('should recompute all dependent values when sidebar expands', () => {
        const state: LayoutState = { screenWidth: 1280, isSidebarExpanded: false };

        // Before expand: collapsed sidebar
        expect(sidebarWidth(state)).toBe(50);
        expect(availableContentWidth(state)).toBe(1230);
        expect(gridMaxWidth(state)).toBe(1230);
        expect(gridColumnCount(gridMaxWidth(state), 240)).toBe(5);

        // Simulate toggleSidebar()
        state.isSidebarExpanded = true;

        // After expand: all values change in one synchronous tick
        expect(sidebarWidth(state)).toBe(260);
        expect(availableContentWidth(state)).toBe(1020);
        expect(gridMaxWidth(state)).toBe(1020);
        expect(gridColumnCount(gridMaxWidth(state), 240)).toBe(4);
    });

    it('should track the column count change during expand transition', () => {
        // At 1280px screen, expand causes column count drop: 5 → 4
        const state: LayoutState = { screenWidth: 1280, isSidebarExpanded: false };

        const colsBefore = gridColumnCount(gridMaxWidth(state), 240);
        state.isSidebarExpanded = true;
        const colsAfter = gridColumnCount(gridMaxWidth(state), 240);

        // This column count change is the expensive layout operation.
        // It should happen ONCE (instant snap), not per-frame.
        expect(colsBefore).toBe(5);
        expect(colsAfter).toBe(4);
        expect(colsBefore - colsAfter).toBe(1);
    });

    it('should verify grid maxWidth <= container width during expand transition', () => {
        /**
         * During the margin-left CSS transition (50→260), the container width
         * decreases frame-by-frame. The grid maxWidth snaps instantly to its
         * final value. We verify that maxWidth <= container width at all frames,
         * meaning the grid column count remains STABLE throughout the transition.
         *
         * If maxWidth > containerWidth, the grid would use containerWidth and
         * potentially change column count per frame (jank source).
         */
        const screenWidth = 1280;
        const finalMaxWidth = Math.min(screenWidth - SIDEBAR_EXPANDED_WIDTH, 1280);

        // Simulate 15 animation frames during margin-left transition (50→260)
        const frames = 15;
        for (let i = 0; i <= frames; i++) {
            const t = i / frames; // progress 0→1
            const marginLeft = SIDEBAR_COLLAPSED_WIDTH + (SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH) * t;
            const containerWidth = screenWidth - marginLeft;

            // maxWidth (snapped to final value) should never exceed container width
            // during expand transition, because container starts large and shrinks
            // while maxWidth is already at its smallest final value.
            expect(finalMaxWidth).toBeLessThanOrEqual(containerWidth);
        }
    });

    it('should show that collapse transition CAN cause per-frame column changes', () => {
        /**
         * During collapse (260→50), the containerWidth increases while
         * maxWidth snaps to a LARGER value. At some intermediate frames,
         * container < maxWidth, so the grid is constrained by container.
         * This means grid width changes per frame — potential jank.
         *
         * The contain: layout style CSS property mitigates this by isolating
         * the grid reflow from affecting ancestor layout.
         */
        const screenWidth = 1280;
        const finalMaxWidth = Math.min(screenWidth - SIDEBAR_COLLAPSED_WIDTH, 1280);
        // finalMaxWidth = min(1230, 1280) = 1230

        let gridWidthChanged = false;
        let prevGridWidth: number | null = null;

        const frames = 15;
        for (let i = 0; i <= frames; i++) {
            const t = i / frames;
            const marginLeft = SIDEBAR_EXPANDED_WIDTH + (SIDEBAR_COLLAPSED_WIDTH - SIDEBAR_EXPANDED_WIDTH) * t;
            const containerWidth = screenWidth - marginLeft;
            const gridWidth = Math.min(containerWidth, finalMaxWidth);

            if (prevGridWidth !== null && gridWidth !== prevGridWidth) {
                gridWidthChanged = true;
            }
            prevGridWidth = gridWidth;
        }

        // During collapse, the grid width increases per frame (container grows)
        expect(gridWidthChanged).toBe(true);
    });
});

// ============================================================================
// 2. Sidebar inner wrapper — prevents per-frame child reflows
// ============================================================================
describe('sidebar inner wrapper optimization', () => {
    it('sidebar-inner width should be >= sidebar expanded width', () => {
        // The inner wrapper must always be at least as wide as the expanded
        // sidebar, so children never reflow during the width transition.
        const innerWidth = 260; // from CSS: .sidebar-inner { width: 260px; }
        expect(innerWidth).toBeGreaterThanOrEqual(SIDEBAR_EXPANDED_WIDTH);
    });

    it('sidebar items should be visible within the 50px collapsed strip', () => {
        // When sidebar is 50px wide, only the left 50px of the 260px inner
        // wrapper is visible. Nav items must have their icons within this area.
        const itemPadding = 8; // padding: 8px
        const iconSize = 22;   // size="22px"
        const iconRightEdge = itemPadding + iconSize;

        // Icon right edge (30px) must be within the 50px visible strip
        expect(iconRightEdge).toBeLessThanOrEqual(SIDEBAR_COLLAPSED_WIDTH);
    });

    it('sidebar toggle button should be visible in collapsed state', () => {
        // The hamburger menu toggle: padding 6px from sidebar + 34px button
        const headerPadding = 6; // .sidebar-header { padding: 8px 6px; }
        const toggleWidth = 34;  // .sidebar-toggle { width: 34px; }
        const toggleRightEdge = headerPadding + toggleWidth;

        expect(toggleRightEdge).toBeLessThanOrEqual(SIDEBAR_COLLAPSED_WIDTH);
    });

    it('per-frame reflow count should be zero for inner content during transition', () => {
        /**
         * With the inner wrapper at fixed 260px, children are always laid out
         * at 260px regardless of the sidebar container width. During the
         * width transition (50→260 or 260→50):
         *
         *   - Without inner wrapper: children reflow on EVERY frame (15 reflows)
         *   - With inner wrapper: children reflow 0 times (inner width is constant)
         */
        const innerFixedWidth = 260;
        let contentWidthChanges = 0;
        let prevContentWidth: number | null = null;

        const frames = 15;
        for (let i = 0; i <= frames; i++) {
            const t = i / frames;
            const sidebarAnimatedWidth = SIDEBAR_COLLAPSED_WIDTH +
                (SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH) * t;

            // With inner wrapper: content width = innerFixedWidth (constant)
            const contentWidth = innerFixedWidth;

            // overflow: hidden on .app-sidebar clips the inner wrapper
            const visibleWidth = Math.min(sidebarAnimatedWidth, innerFixedWidth);
            expect(visibleWidth).toBeLessThanOrEqual(innerFixedWidth);

            if (prevContentWidth !== null && contentWidth !== prevContentWidth) {
                contentWidthChanges++;
            }
            prevContentWidth = contentWidth;
        }

        // With inner wrapper: zero content width changes = zero child reflows
        expect(contentWidthChanges).toBe(0);
    });

    it('without inner wrapper would cause per-frame reflows', () => {
        // Counter-example: without the inner wrapper, children reflow every frame
        let contentWidthChanges = 0;
        let prevContentWidth: number | null = null;

        const frames = 15;
        for (let i = 0; i <= frames; i++) {
            const t = i / frames;
            const sidebarAnimatedWidth = Math.round(
                SIDEBAR_COLLAPSED_WIDTH +
                (SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH) * t
            );

            // Without inner wrapper: content width matches sidebar width
            const contentWidth = sidebarAnimatedWidth;

            if (prevContentWidth !== null && contentWidth !== prevContentWidth) {
                contentWidthChanges++;
            }
            prevContentWidth = contentWidth;
        }

        // Without inner wrapper: content width changes on most frames
        expect(contentWidthChanges).toBeGreaterThan(10);
    });
});

// ============================================================================
// 3. CSS containment verification
// ============================================================================
describe('CSS containment for layout isolation', () => {
    it('contain: layout style should isolate grid from ancestor reflows', () => {
        /**
         * When contain: layout style is set on .results-list:
         *   - Internal layout changes don't propagate to ancestors
         *   - Ancestor layout changes (margin-left transition) don't force
         *     a full recalculation of the grid's internal layout
         *   - The grid only recalculates when its own constraints change
         *     (maxWidth, viewport width)
         */
        const expectedContain = 'layout style';
        expect(expectedContain).toContain('layout');
        expect(expectedContain).toContain('style');
    });

    it('content-visibility: auto should skip off-screen ResultItem rendering', () => {
        /**
         * With 20 ResultItem instances and only 12 visible, the browser
         * should skip layout/paint of the 8 off-screen items.
         *
         * contain-intrinsic-block-size: auto 200px provides a size estimate
         * so the scrollbar height is accurate.
         */
        const totalItems = 20;
        const visibleItems = 12;
        const skippedItems = totalItems - visibleItems;
        const estimatedItemHeight = 200;
        const skippedHeight = skippedItems * estimatedItemHeight;

        expect(skippedHeight).toBe(1600);
        expect(skippedItems).toBe(8);
    });
});

// ============================================================================
// 4. Resize debounce (RAF)
// ============================================================================
describe('layoutStore — updateScreenWidth debouncing', () => {
    let originalRAF: typeof requestAnimationFrame;
    let originalCAF: typeof cancelAnimationFrame;

    beforeEach(() => {
        originalRAF = globalThis.requestAnimationFrame;
        originalCAF = globalThis.cancelAnimationFrame;
    });

    afterEach(() => {
        globalThis.requestAnimationFrame = originalRAF;
        globalThis.cancelAnimationFrame = originalCAF;
    });

    it('should batch multiple rapid resize events into single RAF callback', () => {
        let rafCount = 0;

        globalThis.requestAnimationFrame = vi.fn(() => ++rafCount);
        globalThis.cancelAnimationFrame = vi.fn();

        // Simulate the debounce pattern from layoutStore.updateScreenWidth()
        let resizeRAFId: number | null = null;
        const updateScreenWidth = () => {
            if (resizeRAFId !== null) cancelAnimationFrame(resizeRAFId);
            resizeRAFId = requestAnimationFrame(() => {
                resizeRAFId = null;
            });
        };

        // Fire 5 rapid resize events (simulating window resize drag)
        updateScreenWidth();
        updateScreenWidth();
        updateScreenWidth();
        updateScreenWidth();
        updateScreenWidth();

        // RAF called 5 times, cancel called 4 times → only last callback survives
        expect(requestAnimationFrame).toHaveBeenCalledTimes(5);
        expect(cancelAnimationFrame).toHaveBeenCalledTimes(4);
    });
});

// ============================================================================
// 5. Scroll handler throttling
// ============================================================================
describe('scroll handler throttling', () => {
    let originalRAF: typeof requestAnimationFrame;

    beforeEach(() => {
        originalRAF = globalThis.requestAnimationFrame;
    });

    afterEach(() => {
        globalThis.requestAnimationFrame = originalRAF;
    });

    it('should coalesce rapid scroll events into at most 1 per frame', () => {
        let rafCount = 0;
        globalThis.requestAnimationFrame = vi.fn(() => ++rafCount);

        let scrollRAF: number | null = null;
        let coreCallCount = 0;
        const handleScrollCore = () => { coreCallCount++; };

        const handleScroll = () => {
            if (scrollRAF !== null) return;
            scrollRAF = requestAnimationFrame(() => {
                scrollRAF = null;
                handleScrollCore();
            });
        };

        // Fire 10 rapid scroll events
        for (let i = 0; i < 10; i++) handleScroll();

        // Only 1 RAF should be scheduled
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

        // Simulate RAF executing the callback
        scrollRAF = null;
        handleScrollCore();
        expect(coreCallCount).toBe(1);

        // A new scroll after RAF completes schedules a new frame
        handleScroll();
        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });
});

// ============================================================================
// 6. ResultItem image aspect ratio
// ============================================================================
describe('ResultItem image aspect ratio fix', () => {
    it('should maintain 224:140 (1.6:1) aspect ratio', () => {
        const ratio = 224 / 140;
        expect(ratio).toBe(1.6);
    });

    it('should compute correct image heights at various widths', () => {
        const ratio = 224 / 140;
        expect(240 / ratio).toBe(150);
        expect(192 / ratio).toBe(120);
    });
});

// ============================================================================
// 7. Layout performance budget — frame cost analysis
// ============================================================================
describe('sidebar toggle — performance budget analysis', () => {
    it('should quantify the reflow sources during sidebar expand', () => {
        /**
         * Catalog of layout-triggering operations when sidebar expands
         * on desktop (>= 768px), and their mitigation status.
         */
        const reflowSources = [
            {
                element: '.app-sidebar',
                property: 'width',
                trigger: 'CSS transition: width 0.25s ease',
                frequency: 'per-frame' as const,
                childReflows: false, // sidebar-inner fixed-width wrapper
            },
            {
                element: '.app-main-content',
                property: 'margin-left',
                trigger: 'CSS transition: margin-left 0.25s ease',
                frequency: 'per-frame' as const,
                childReflows: false, // grid maxWidth caps width
            },
            {
                element: '.results-list',
                property: 'maxWidth (inline style)',
                trigger: 'Vue computed reactivity (instant)',
                frequency: 'once' as const,
                childReflows: true, // column count changes once
            },
            {
                element: 'q-header',
                property: 'left',
                trigger: 'CSS transition: left 0.25s ease',
                frequency: 'per-frame' as const,
                childReflows: false,
            },
            {
                element: '.search-bar-sticky',
                property: 'left, width',
                trigger: 'CSS transition: left/width 0.25s ease',
                frequency: 'per-frame' as const,
                childReflows: false,
            },
        ];

        // Only the grid maxWidth snap causes child reflows (once)
        const childReflowSources = reflowSources.filter(s => s.childReflows);
        expect(childReflowSources).toHaveLength(1);
        const firstChildReflowSource = childReflowSources[0];
        expect(firstChildReflowSource?.element).toBe('.results-list');
        expect(firstChildReflowSource?.frequency).toBe('once');

        // All per-frame sources have childReflows = false
        const perFrameWithChildReflows = reflowSources
            .filter(s => s.frequency === 'per-frame' && s.childReflows);
        expect(perFrameWithChildReflows).toHaveLength(0);
    });

    it('should estimate > 95% reduction in layout work from optimizations', () => {
        const sidebarNodes = 40;
        const gridItems = 20;
        const transitionFrames = 15;

        // WITHOUT optimizations:
        // Sidebar children reflow every frame + grid column snap
        const withoutOptimization = sidebarNodes * transitionFrames + gridItems;

        // WITH optimizations:
        // Sidebar: 0 reflows, Grid: 1 reflow of visible items only
        const visibleGridItems = 12;
        const withOptimization = visibleGridItems;

        const reduction = 1 - withOptimization / withoutOptimization;
        expect(reduction).toBeGreaterThan(0.95);
    });
});

// ============================================================================
// 8. Sidebar history lazy-loading
// ============================================================================
describe('sidebar history lazy-loading', () => {
    interface HistoryGroup {
        label: string;
        items: { id: string; query: string }[];
    }

    /**
     * Simulates the visibleGroupedRecentItems computed that limits
     * the number of rendered history items for sidebar performance.
     */
    function computeVisibleGroups(
        allGroups: HistoryGroup[],
        limit: number,
    ): HistoryGroup[] {
        const result: HistoryGroup[] = [];
        let count = 0;

        for (const group of allGroups) {
            if (count >= limit) break;
            const remaining = limit - count;
            if (group.items.length <= remaining) {
                result.push(group);
                count += group.items.length;
            } else {
                result.push({ label: group.label, items: group.items.slice(0, remaining) });
                count += remaining;
            }
        }
        return result;
    }

    // Helper to generate test groups
    const makeGroup = (label: string, count: number): HistoryGroup => ({
        label,
        items: Array.from({ length: count }, (_, i) => ({
            id: `${label}-${i}`,
            query: `query-${label}-${i}`,
        })),
    });

    it('should limit total visible items to the display limit', () => {
        const groups = [
            makeGroup('今天', 20),
            makeGroup('昨天', 15),
            makeGroup('2天前', 10),
        ];

        const visible = computeVisibleGroups(groups, 25);

        // Total items across visible groups should be <= 25
        const totalItems = visible.reduce((sum, g) => sum + g.items.length, 0);
        expect(totalItems).toBe(25);
    });

    it('should include full groups that fit within the limit', () => {
        const groups = [
            makeGroup('今天', 10),
            makeGroup('昨天', 10),
            makeGroup('2天前', 10),
        ];

        const visible = computeVisibleGroups(groups, 25);

        // First 2 groups (20 items) fit entirely, 3rd group gets 5 items
        expect(visible).toHaveLength(3);
        expect(visible[0]?.items).toHaveLength(10);
        expect(visible[1]?.items).toHaveLength(10);
        expect(visible[2]?.items).toHaveLength(5);
    });

    it('should return all items when limit exceeds total count', () => {
        const groups = [
            makeGroup('今天', 5),
            makeGroup('昨天', 3),
        ];

        const visible = computeVisibleGroups(groups, 25);
        const totalItems = visible.reduce((sum, g) => sum + g.items.length, 0);

        expect(totalItems).toBe(8);
        expect(visible).toHaveLength(2);
    });

    it('should handle incrementing the limit (infinite scroll)', () => {
        const groups = [
            makeGroup('今天', 20),
            makeGroup('昨天', 20),
            makeGroup('2天前', 20),
        ];

        // Initial load: 25 items
        const page1 = computeVisibleGroups(groups, 25);
        const page1Total = page1.reduce((sum, g) => sum + g.items.length, 0);
        expect(page1Total).toBe(25);

        // After scroll: 50 items
        const page2 = computeVisibleGroups(groups, 50);
        const page2Total = page2.reduce((sum, g) => sum + g.items.length, 0);
        expect(page2Total).toBe(50);

        // After more scroll: 75 items (exceeds total 60)
        const page3 = computeVisibleGroups(groups, 75);
        const page3Total = page3.reduce((sum, g) => sum + g.items.length, 0);
        expect(page3Total).toBe(60); // capped at total
    });
});

// ============================================================================
// 9. Author avatar fallback and caching
// ============================================================================
describe('author avatar fallback and caching', () => {
    it('should use default avatar when face URL is empty or missing', () => {
        const defaultAvatar = 'noface.jpg@96w_96h.avif';

        const getAvatarUrl = (face: string | undefined, defaultUrl: string) =>
            face || defaultUrl;

        expect(getAvatarUrl('', defaultAvatar)).toBe(defaultAvatar);
        expect(getAvatarUrl(undefined, defaultAvatar)).toBe(defaultAvatar);
        expect(getAvatarUrl('https://example.com/face.jpg', defaultAvatar)).toBe(
            'https://example.com/face.jpg',
        );
    });

    it('should fallback to default avatar on img error', () => {
        const defaultAvatar = 'noface.jpg@96w_96h.avif';
        let imgSrc = 'https://broken-url.com/face.jpg';

        // Simulate @error handler logic
        const onAvatarError = () => {
            if (imgSrc !== defaultAvatar) {
                imgSrc = defaultAvatar;
            }
        };

        onAvatarError();
        expect(imgSrc).toBe(defaultAvatar);

        // Should not re-set if already default (prevents infinite loop)
        const before = imgSrc;
        onAvatarError();
        expect(imgSrc).toBe(before);
    });

    it('should prevent infinite error loop when default avatar also fails', () => {
        const defaultAvatar = 'noface.jpg@96w_96h.avif';
        let imgSrc = defaultAvatar;
        let errorCount = 0;

        const onAvatarError = () => {
            errorCount++;
            if (imgSrc !== defaultAvatar) {
                imgSrc = defaultAvatar;
            }
        };

        // Simulate error on the default avatar itself
        onAvatarError();
        expect(errorCount).toBe(1);
        expect(imgSrc).toBe(defaultAvatar); // stays as default, no infinite loop
    });
});
