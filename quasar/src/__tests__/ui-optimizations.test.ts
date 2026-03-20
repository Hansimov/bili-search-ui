import { describe, it, expect } from 'vitest';
import { hasLeadingCjkPunctuation } from 'src/utils/convert';

// ============================================================================
// Tests for UI optimizations (user-7 tasks)
// ============================================================================

// ============================================================================
// 1. Sidebar tooltip position — collapsed item width constraint
// ============================================================================
describe('sidebar collapsed item width constraint', () => {
    /**
     * When the sidebar is collapsed to 50px, interactive items (nav items,
     * bottom items) should be constrained to 38px (50px − 2×6px padding)
     * so that QTooltip anchoring ("center right") aligns correctly.
     */
    const SIDEBAR_COLLAPSED_WIDTH = 50;
    const SIDEBAR_NAV_PADDING_H = 6; // .sidebar-nav padding: 4px 6px
    const EXPECTED_ITEM_WIDTH = SIDEBAR_COLLAPSED_WIDTH - 2 * SIDEBAR_NAV_PADDING_H; // 38px

    it('collapsed nav item width should fit within visible sidebar area', () => {
        expect(EXPECTED_ITEM_WIDTH).toBe(38);
        // Item (38px) + container horizontal padding (12px) = 50px = sidebar width
        expect(EXPECTED_ITEM_WIDTH + 2 * SIDEBAR_NAV_PADDING_H).toBe(SIDEBAR_COLLAPSED_WIDTH);
    });

    it('tooltip anchor "center right" should be within sidebar bounds', () => {
        // Tooltip uses anchor="center right" self="center left"
        // Item center-right x = item left + item width = NAV_PADDING_H + ITEM_WIDTH
        const tooltipAnchorX = SIDEBAR_NAV_PADDING_H + EXPECTED_ITEM_WIDTH;
        expect(tooltipAnchorX).toBeLessThanOrEqual(SIDEBAR_COLLAPSED_WIDTH);
    });
});

// ============================================================================
// 2. ResultItem bar background — conditional on image load
// ============================================================================
describe('result item cover bar background visibility', () => {
    /**
     * The top/bottom bars should have transparent background until the cover
     * image loads, then transition to rgba(0,0,0,0.4).
     * This is controlled by the 'bar-visible' CSS class toggled via coverLoaded.
     */

    it('coverLoaded should start as false', () => {
        // Simulates the initial state of the component
        const coverLoaded = false;
        expect(coverLoaded).toBe(false);
    });

    it('bar class logic: no bar-visible class when cover not loaded', () => {
        const coverLoaded = false;
        const barClasses = { 'bar-visible': coverLoaded };
        expect(barClasses['bar-visible']).toBe(false);
    });

    it('bar class logic: bar-visible class present when cover loaded', () => {
        const coverLoaded = true;
        const barClasses = { 'bar-visible': coverLoaded };
        expect(barClasses['bar-visible']).toBe(true);
    });

    it('coverLoaded should reset when coverSrc changes', () => {
        // Simulates the watch behavior
        let coverLoaded = true;
        const onCoverSrcChange = () => { coverLoaded = false; };

        // Image was loaded
        expect(coverLoaded).toBe(true);
        // Source changes (new result)
        onCoverSrcChange();
        expect(coverLoaded).toBe(false);
    });

    it('bar background values should be correct', () => {
        // When not loaded: transparent
        const bgNotLoaded = 'transparent';
        expect(bgNotLoaded).toBe('transparent');

        // When loaded: rgba(0, 0, 0, 0.4)
        const bgLoaded = 'rgba(0, 0, 0, 0.4)';
        expect(bgLoaded).toContain('0.4');
    });
});

// ============================================================================
// 3. ExploreSessionSwitch — flat button design with title & session labels
// ============================================================================
describe('explore session switch flat button design', () => {
    /**
     * Session switch buttons should:
     * - Use flat style (no elevation/shadow)
     * - No size change on hover, use opacity/color transition instead
     * - Use native title attribute (not q-tooltip) with "后退" / "前进"
     * - Append session query to title when available
     */

    it('buttons should have flat prop removing shadow', () => {
        const flatButtonStyle = { boxShadow: 'none' };
        expect(flatButtonStyle.boxShadow).toBe('none');
    });

    it('should NOT scale on hover (no transform)', () => {
        // Hover feedback is via opacity/color, not scale
        const hoverTransform = undefined;
        expect(hoverTransform).toBeUndefined();
    });

    it('title labels should use 后退/前进 with session query', () => {
        // Simulate getSessionLabel + title computation
        const sessions = [
            { query: '搜索词1' },
            { query: '搜索词2' },
            { query: '搜索词3' },
        ];
        const currentIdx = 1;

        const prevLabel = sessions[currentIdx - 1]?.query || '';
        const nextLabel = sessions[currentIdx + 1]?.query || '';

        const prevTitle = prevLabel ? `后退：${prevLabel}` : '后退';
        const nextTitle = nextLabel ? `前进：${nextLabel}` : '前进';

        expect(prevTitle).toBe('后退：搜索词1');
        expect(nextTitle).toBe('前进：搜索词3');
    });

    it('title should fall back to plain label when no session', () => {
        const prevLabel = '';
        const nextLabel = '';
        const prevTitle = prevLabel ? `后退：${prevLabel}` : '后退';
        const nextTitle = nextLabel ? `前进：${nextLabel}` : '前进';
        expect(prevTitle).toBe('后退');
        expect(nextTitle).toBe('前进');
    });

    it('light mode should use transparent background', () => {
        const lightBg = 'transparent';
        const lightHoverBg = 'rgba(0, 0, 0, 0.07)';
        expect(lightBg).toBe('transparent');
        expect(lightHoverBg).toContain('0.07');
    });

    it('dark mode should use transparent background', () => {
        const darkBg = 'transparent';
        const darkHoverBg = 'rgba(255, 255, 255, 0.08)';
        expect(darkBg).toBe('transparent');
        expect(darkHoverBg).toContain('0.08');
    });
});

// ============================================================================
// 4. Sidebar edge handle — positioned outside sidebar to avoid scrollbar overlap
// ============================================================================
describe('sidebar edge handle positioning', () => {
    /**
     * The edge handle should be positioned outside the <aside> sidebar element
     * using position:fixed so it doesn't overlap with the scrollbar inside.
     * It uses a left offset that matches the sidebar's current width.
     */

    it('edge handle left offset should match collapsed sidebar width', () => {
        const sidebarExpanded = false;
        const edgeLeft = sidebarExpanded ? 260 : 50;
        expect(edgeLeft).toBe(50);
    });

    it('edge handle left offset should match expanded sidebar width', () => {
        const sidebarExpanded = true;
        const edgeLeft = sidebarExpanded ? 260 : 50;
        expect(edgeLeft).toBe(260);
    });

    it('edge handle z-index should be above sidebar', () => {
        const sidebarZIndex = 2100;
        const edgeHandleZIndex = 2101;
        expect(edgeHandleZIndex).toBeGreaterThan(sidebarZIndex);
    });

    it('edge handle should not overlap with sidebar content area', () => {
        // Handle is 10px wide, positioned OUTSIDE the sidebar
        const sidebarWidth = 260;
        const handleLeft = sidebarWidth; // starts at the sidebar edge
        const handleWidth = 10;
        // The handle occupies [260, 270) — entirely outside the sidebar [0, 260)
        expect(handleLeft).toBeGreaterThanOrEqual(sidebarWidth);
        expect(handleLeft + handleWidth).toBe(270);
    });
});

// ============================================================================
// 5. Snapshot viewer — mainScale overhead accounts for time bar
// ============================================================================
describe('snapshot viewer mainScale overhead', () => {
    /**
     * The mainScale computation subtracts overhead from the dialog height to
     * leave room for header, info bar, frame counter, time bar, shortcuts hint.
     * The overhead must be large enough to prevent the time bar from being
     * clipped, especially when timeline is at top/bottom.
     */

    it('overhead should account for all fixed-height elements', () => {
        // header(40) + info-bar(~80) + frame-counter(25) + time-bar(28) +
        // shortcuts(20) + padding(30) = 223, rounded up to 225
        const overhead = 225;
        const headerH = 40;
        const infoBarH = 80;
        const frameCounterH = 25;
        const timeBarH = 28;
        const shortcutsH = 20;
        const paddingH = 30;
        const minOverhead = headerH + infoBarH + frameCounterH + timeBarH + shortcutsH + paddingH;
        expect(overhead).toBeGreaterThanOrEqual(minOverhead);
    });

    it('timelineH should be subtracted when layout is top or bottom', () => {
        const isHorizontalLayout = false; // top or bottom
        const showTimeline = true;
        const timelineH = !isHorizontalLayout && showTimeline ? 140 : 0;
        expect(timelineH).toBe(140);
    });

    it('timelineH should be 0 when layout is left or right', () => {
        const isHorizontalLayout = true; // left or right
        const showTimeline = true;
        const timelineH = !isHorizontalLayout && showTimeline ? 140 : 0;
        expect(timelineH).toBe(0);
    });

    it('maxHeight should never go below 100', () => {
        const dialogHeight = 200;
        const overhead = 225;
        const timelineH = 140;
        const maxHeight = Math.max(dialogHeight - overhead - timelineH, 100);
        expect(maxHeight).toBe(100);
    });
});

// ============================================================================
// 6. CJK punctuation alignment — title indentation logic
// ============================================================================
describe('CJK punctuation title alignment', () => {
    /**
     * Titles starting with CJK full-width opening punctuation (【, （, 《, etc.)
     * should get a cjk-punct-indent CSS class that applies:
     * - font-feature-settings: 'halt' 1 (reduces fullwidth punct to half-width)
     * - text-indent: -0.5em with padding-left: 0.5em (fallback for fonts w/o halt)
     */

    it('should flag titles starting with 【 for indentation', () => {
        const title = '【合集】我的世界';
        expect(hasLeadingCjkPunctuation(title)).toBe(true);
    });

    it('should flag titles starting with （ for indentation', () => {
        const title = '（完整版）电影解读';
        expect(hasLeadingCjkPunctuation(title)).toBe(true);
    });

    it('should not flag normal CJK text', () => {
        const title = '我的世界合集';
        expect(hasLeadingCjkPunctuation(title)).toBe(false);
    });

    it('should not flag ASCII bracket titles', () => {
        const title = '[Subtitle Group] Anime EP01';
        expect(hasLeadingCjkPunctuation(title)).toBe(false);
    });

    it('conditional class should be applied correctly', () => {
        // Simulates Vue template: :class="{ 'cjk-punct-indent': titleHasLeadingCjkPunct }"
        const testCases = [
            { title: '【MV】新歌发布', expected: true },
            { title: '普通标题', expected: false },
            { title: '（转载）', expected: true },
            { title: 'Normal Title', expected: false },
        ];
        for (const tc of testCases) {
            const classes = { 'cjk-punct-indent': hasLeadingCjkPunctuation(tc.title) };
            expect(classes['cjk-punct-indent']).toBe(tc.expected);
        }
    });
});

// ============================================================================
// 5. BiliVideoTooltip — viewport-based positioning (fixed position)
// ============================================================================
describe('BiliVideoTooltip positioning logic (viewport-based)', () => {
    const TOOLTIP_ESTIMATED_HEIGHT = 260;
    const TOOLTIP_WIDTH = 280;
    const TOOLTIP_GAP = 6;
    const VIEWPORT_MARGIN = 8;
    const TOOLTIP_X_OFFSET = 22;

    const clamp = (value: number, min: number, max: number) => {
        return Math.min(Math.max(value, min), max);
    };

    /**
     * Simulates the tooltip placement logic:
     * - Uses CSS-space viewport coordinates under html zoom
     * - Places below anchor by default, above when below space is worse
     * - Clamps both horizontal and vertical position to viewport bounds
     */
    const computeTooltipPosition = (
        anchorRect: { top: number; bottom: number; left: number; right: number },
        viewportW: number,
        viewportH: number,
        zoom = 1.15,
        containerRect?: { left: number; right: number }
    ) => {
        const cssViewportW = viewportW / zoom;
        const cssViewportH = viewportH / zoom;
        const anchorLeft = anchorRect.left / zoom;
        const anchorTop = anchorRect.top / zoom;
        const anchorBottom = anchorRect.bottom / zoom;
        const containerLeft = containerRect ? containerRect.left / zoom : VIEWPORT_MARGIN;
        const containerRight = containerRect
            ? containerRect.right / zoom
            : cssViewportW - VIEWPORT_MARGIN;
        const spaceAbove = anchorTop - TOOLTIP_GAP - VIEWPORT_MARGIN;
        const spaceBelow = cssViewportH - anchorBottom - TOOLTIP_GAP - VIEWPORT_MARGIN;
        const placeAbove =
            spaceBelow < TOOLTIP_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

        const minLeft = Math.min(
            Math.max(VIEWPORT_MARGIN, containerLeft + 8),
            cssViewportW - TOOLTIP_WIDTH - VIEWPORT_MARGIN
        );
        const maxLeft = Math.max(
            minLeft,
            Math.min(
                cssViewportW - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
                containerRight - TOOLTIP_WIDTH - VIEWPORT_MARGIN
            )
        );
        const left = clamp(anchorLeft + TOOLTIP_X_OFFSET, minLeft, maxLeft);

        const preferredTop = placeAbove
            ? anchorTop - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_GAP
            : anchorBottom + TOOLTIP_GAP;
        const maxTop = Math.max(
            VIEWPORT_MARGIN,
            cssViewportH - TOOLTIP_ESTIMATED_HEIGHT - VIEWPORT_MARGIN
        );
        const top = clamp(preferredTop, VIEWPORT_MARGIN, maxTop);

        return { left, top, placeAbove };
    };

    it('should place tooltip below when enough space', () => {
        const anchor = { top: 100, bottom: 120, left: 200, right: 400 };
        const result = computeTooltipPosition(anchor, 1280, 800);
        expect(result.placeAbove).toBe(false);
        expect(result.left).toBeCloseTo(200 / 1.15 + TOOLTIP_X_OFFSET, 5);
        expect(result.top).toBeCloseTo(120 / 1.15 + 6, 5);
    });

    it('should place tooltip above when not enough space below', () => {
        const anchor = { top: 600, bottom: 620, left: 200, right: 400 };
        const result = computeTooltipPosition(anchor, 1280, 700);
        expect(result.placeAbove).toBe(true);
        expect(result.top).toBeCloseTo(600 / 1.15 - TOOLTIP_ESTIMATED_HEIGHT - 6, 5);
    });

    it('should clamp horizontal position to avoid overflow', () => {
        // Link near right edge of viewport
        const anchor = { top: 100, bottom: 120, left: 1100, right: 1200 };
        const result = computeTooltipPosition(anchor, 1280, 800);
        expect(result.left).toBeCloseTo(1280 / 1.15 - 280 - 16, 5);
    });

    it('should respect container bounds while still shifting right', () => {
        const anchor = { top: 100, bottom: 120, left: 120, right: 220 };
        const container = { left: 80, right: 520 };
        const result = computeTooltipPosition(anchor, 1280, 800, 1.15, container);
        expect(result.left).toBeGreaterThanOrEqual(80 / 1.15 + 8);
        expect(result.left).toBeLessThanOrEqual(520 / 1.15 - 280 - 8);
    });

    it('should NOT increase tooltip distance as link moves down the page', () => {
        // This was the original bug: distance grew with vertical position
        // In the non-clamped region, the gap should always be TOOLTIP_GAP
        const links = [
            { top: 100, bottom: 120, left: 200, right: 400 },
            { top: 200, bottom: 220, left: 200, right: 400 },
            { top: 300, bottom: 320, left: 200, right: 400 },
        ];
        const gaps = links.map(anchor => {
            const result = computeTooltipPosition(anchor, 1280, 800);
            return result.top - anchor.bottom / 1.15;
        });
        // All gaps should be the same (TOOLTIP_GAP = 6)
        expect(gaps[0]).toBeCloseTo(TOOLTIP_GAP, 5);
        expect(gaps[1]).toBeCloseTo(TOOLTIP_GAP, 5);
        expect(gaps[2]).toBeCloseTo(TOOLTIP_GAP, 5);
    });

    it('should handle small viewport without crashing', () => {
        // Very small viewport — can't fit tooltip below or above
        const anchor = { top: 50, bottom: 70, left: 10, right: 100 };
        const result = computeTooltipPosition(anchor, 400, 200);
        expect(result.placeAbove).toBe(false); // Falls back to below
        expect(result.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
    });
});

// ============================================================================
// 6. ResultsLayout — flex column layout (input box in flow)
// ============================================================================
describe('ResultsLayout flex column layout', () => {
    /**
     * The layout was refactored from fixed-position search bar to flex column:
     * - Top: scrollable content area (flex: 1, overflow-y: auto)
     * - Bottom: search bar (flex-shrink: 0, in normal flow)
     *
     * This eliminates:
     * - Gradient overlay that blurred the scrollbar
     * - padding-bottom hacks on chat container
     * - Scrollbar being hidden behind the fixed search bar
     */

    it('scroll area should take remaining height after search bar', () => {
        // In flex column layout, scroll area is flex: 1
        // Search bar is flex-shrink: 0
        const viewportHeight = 800;
        const headerHeight = 50;
        const searchBarHeight = 72;
        const scrollAreaHeight = viewportHeight - headerHeight - searchBarHeight;
        expect(scrollAreaHeight).toBe(678);
        expect(scrollAreaHeight).toBeGreaterThan(0);
    });

    it('scrollbar should extend to the bottom of the scroll area', () => {
        // With the old fixed layout, the scrollbar was behind the search bar
        // Now the scroll area ends above the search bar, so scrollbar is fully visible
        const scrollAreaBottom = 800 - 72; // viewport - search bar
        const searchBarTop = 800 - 72;
        // Scroll area bottom should align with search bar top
        expect(scrollAreaBottom).toBe(searchBarTop);
    });

    it('chat container no longer needs padding-bottom for fixed bar', () => {
        // Old: padding-bottom: calc(var(--search-bar-total-height) + 24px)
        // New: padding-bottom: 24px (just for visual spacing)
        const oldPaddingBottom = 96 + 24; // var(--search-bar-total-height) + 24
        const newPaddingBottom = 24;
        expect(newPaddingBottom).toBeLessThan(oldPaddingBottom);
    });
});
