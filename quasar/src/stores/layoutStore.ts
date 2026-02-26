import { defineStore } from 'pinia';

/** RAF id for debounced resize handler */
let resizeRAFId: number | null = null;

/** 侧边栏宽度常量 */
const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 50;

/**
 * 响应式断点（3种模式）：
 * - Mobile  (< 570px):  无侧边栏，汉堡菜单在 toolbar，侧边栏以 overlay 形式打开
 * - Tablet  (570–767px): 侧边栏可见（仅收起态），展开时以 overlay 形式，不推动内容
 * - Desktop (>= 768px):  侧边栏可见，展开/收起推动内容
 *
 * 570 = 520（保证结果列表2列最小宽度）+ 50（收起的侧边栏宽度）
 */
const MOBILE_BREAKPOINT = 570;
const DESKTOP_BREAKPOINT = 768;

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        /** @deprecated 旧抽屉可见性，保留兼容 */
        isSearchRecordsVisible: false,
        screenWidth: window.innerWidth,
        searchRecordsListWidth: 300,
        isMouseInSearchBar: false,
        isSuggestVisible: false,
        activeTab: 'videos',
        currentPage: 1 as number,
        itemsPerPage: 20 as number,
        authorsListHeight: 0 as number,
        loadedPages: new Set([1]) as Set<number>,
        /** 侧边栏是否展开 */
        isSidebarExpanded: JSON.parse(localStorage.getItem('isSidebarExpanded') || 'true') as boolean,
        /** 移动端侧边栏是否打开（overlay 模式） */
        isMobileSidebarOpen: false,
        /** 建议列表中当前选中项索引，-1 表示无选中 */
        suggestSelectedIndex: -1 as number,
        /** 箭头导航前的原始查询文本（用于返回时恢复） */
        preNavQuery: null as string | null,
        /** 搜索栏总高度（含 sticky padding），由 SearchInput 设置，用于结果列表 maxHeight 计算 */
        searchBarTotalHeight: 96 as number,
    }),
    actions: {
        /** 是否为移动端模式（< 570px）：无侧边栏，汉堡菜单 */
        isMobileMode() {
            return this.screenWidth < MOBILE_BREAKPOINT;
        },
        /** 是否为平板模式（570–767px）：侧边栏收起可见，展开为 overlay */
        isTabletMode() {
            return this.screenWidth >= MOBILE_BREAKPOINT && this.screenWidth < DESKTOP_BREAKPOINT;
        },
        /** 是否为桌面模式（>= 768px）：侧边栏推动内容 */
        isDesktopFullMode() {
            return this.screenWidth >= DESKTOP_BREAKPOINT;
        },
        /** 是否有侧边栏（>= 570px）：tablet + desktop */
        hasSidebar() {
            return this.screenWidth >= MOBILE_BREAKPOINT;
        },
        /** @deprecated 保留兼容，等同 hasSidebar() */
        isDesktopMode() {
            return this.hasSidebar();
        },
        /** 侧边栏展开时是否以 overlay 方式显示（mobile + tablet） */
        isSidebarOverlayMode() {
            return this.screenWidth < DESKTOP_BREAKPOINT;
        },
        /** 获取侧边栏当前宽度（用于内容区域偏移，仅计算推动内容的宽度） */
        sidebarWidth(): number {
            if (this.isMobileMode()) return 0;
            if (this.isTabletMode()) return SIDEBAR_COLLAPSED_WIDTH; // tablet 展开是 overlay，不推动
            return this.isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
        },
        isSearchRecordsListHasWidth() {
            return this.hasSidebar();
        },
        availableContentWidth() {
            if (this.hasSidebar()) {
                return this.screenWidth - this.sidebarWidth();
            } else {
                return this.screenWidth;
            }
        },
        isCollapsePaginate() {
            return this.availableContentWidth() < 1000;
        },
        isSmallScreen() {
            return this.availableContentWidth() < 520;
        },
        /** 切换侧边栏展开/折叠 */
        toggleSidebar() {
            this.isSidebarExpanded = !this.isSidebarExpanded;
            localStorage.setItem('isSidebarExpanded', JSON.stringify(this.isSidebarExpanded));
            this.updateSearchInputMaxWidth();
        },
        /** 设置侧边栏展开/收起状态 */
        setSidebarExpanded(expanded: boolean) {
            if (this.isSidebarExpanded !== expanded) {
                this.isSidebarExpanded = expanded;
                localStorage.setItem('isSidebarExpanded', JSON.stringify(expanded));
                this.updateSearchInputMaxWidth();
            }
        },
        /** 切换移动端侧边栏（overlay 模式） */
        toggleMobileSidebar() {
            this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
        },
        /** 关闭移动端侧边栏 */
        closeMobileSidebar() {
            this.isMobileSidebarOpen = false;
        },
        /** @deprecated 旧方法保留兼容 */
        toggleSearchRecordsList() {
            this.toggleSidebar();
        },
        updateSearchInputMaxWidth() {
            let searchInputMaxWidth;
            if (this.hasSidebar()) {
                searchInputMaxWidth = `calc(${this.availableContentWidth()}px - 5vw)`;
            } else {
                searchInputMaxWidth = '95vw';
            }
            document.documentElement.style.setProperty(
                '--search-input-max-width',
                searchInputMaxWidth
            );
        },
        updateScreenWidth() {
            if (resizeRAFId !== null) cancelAnimationFrame(resizeRAFId);
            resizeRAFId = requestAnimationFrame(() => {
                resizeRAFId = null;
                const prevWidth = this.screenWidth;
                this.screenWidth = window.innerWidth;

                // Auto-collapse sidebar when screen narrows past desktop breakpoint
                if (prevWidth >= DESKTOP_BREAKPOINT && this.screenWidth < DESKTOP_BREAKPOINT) {
                    // Entering tablet/mobile range: collapse expanded sidebar
                    if (this.isSidebarExpanded) {
                        this.isSidebarExpanded = false;
                        localStorage.setItem('isSidebarExpanded', JSON.stringify(false));
                    }
                }
                // Close overlay sidebar when entering mobile range
                if (prevWidth >= MOBILE_BREAKPOINT && this.screenWidth < MOBILE_BREAKPOINT) {
                    this.isMobileSidebarOpen = false;
                }

                this.updateSearchInputMaxWidth();
            });
        },
        updateDrawerWidth(newWidth: number) {
            this.searchRecordsListWidth = newWidth;
            this.updateSearchInputMaxWidth();
        },
        addWindowResizeListener() {
            window.addEventListener('resize', this.updateScreenWidth);
        },
        removeWindowResizeListener() {
            window.removeEventListener('resize', this.updateScreenWidth);
        },
        setIsMouseInSearchBar(newIsMouseInSearchBar: boolean) {
            this.isMouseInSearchBar = newIsMouseInSearchBar;
        },
        setIsSuggestVisible(newVisibility: boolean) {
            this.isSuggestVisible = newVisibility;
        },
        setActiveTab(newActiveTab: string) {
            this.activeTab = newActiveTab;
        },
        setCurrentPage(newPage: number) {
            this.currentPage = newPage;
        },
        setItemsPerPage(newItemsPerPage: number) {
            this.itemsPerPage = newItemsPerPage;
        },
        setAuthorsListHeight(newHeight: number) {
            this.authorsListHeight = newHeight;
        },
        addLoadedPages(pages: number[]) {
            pages.forEach(page => this.loadedPages.add(page));
        },
        resetLoadedPages() {
            this.loadedPages = new Set([1]);
            this.currentPage = 1;
        },
        /** 设置当前建议选中索引 */
        setSuggestSelectedIndex(index: number) {
            this.suggestSelectedIndex = index;
        },
        /** 重置建议导航状态 */
        resetSuggestNavigation() {
            this.suggestSelectedIndex = -1;
            this.preNavQuery = null;
        },
        /** 保存导航前的查询文本（仅在首次导航时保存） */
        savePreNavQuery(query: string) {
            if (this.preNavQuery === null) {
                this.preNavQuery = query;
            }
        },
        /** 设置搜索栏总高度 */
        setSearchBarTotalHeight(height: number) {
            this.searchBarTotalHeight = height;
        },
    },
});
