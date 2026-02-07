import { defineStore } from 'pinia';

/** 侧边栏宽度常量 */
const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 50;

/**
 * 响应式断点（3种模式）：
 * - Mobile  (< 520px):  无侧边栏，汉堡菜单在 toolbar，侧边栏以 overlay 形式打开
 * - Tablet  (520–1279px): 侧边栏可见（默认收起），展开推动内容，无 overlay
 * - Desktop (>= 1280px): 侧边栏可见（默认展开），展开推动内容，无 overlay
 */
const MOBILE_BREAKPOINT = 520;

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        /** @deprecated 旧抽屉可见性，保留兼容 */
        isSearchRecordsVisible: false,
        screenWidth: window.innerWidth,
        searchRecordsListWidth: 300,
        isMouseInSearchBar: false,
        isMouseInAiSearchToggle: false,
        isSuggestVisible: false,
        isAiSuggestVisible: false,
        isAiChatVisible: false,
        isSearchOptionsBarVisible: true,
        activeTab: 'videos',
        currentPage: 1 as number,
        itemsPerPage: 20 as number,
        authorsListHeight: 0 as number,
        loadedPages: new Set([1]) as Set<number>,
        /** 侧边栏是否展开 */
        isSidebarExpanded: JSON.parse(localStorage.getItem('isSidebarExpanded') || 'true') as boolean,
        /** 移动端侧边栏是否打开（overlay 模式） */
        isMobileSidebarOpen: false,
    }),
    actions: {
        /** 是否为移动端模式（< 768px）：无侧边栏，汉堡菜单 */
        isMobileMode() {
            return this.screenWidth < MOBILE_BREAKPOINT;
        },
        /** 是否有侧边栏（>= 768px）：tablet + desktop */
        hasSidebar() {
            return this.screenWidth >= MOBILE_BREAKPOINT;
        },
        /** @deprecated 保留兼容，等同 hasSidebar() */
        isDesktopMode() {
            return this.hasSidebar();
        },
        /** 获取侧边栏当前宽度（用于内容区域偏移） */
        sidebarWidth(): number {
            if (this.isMobileMode()) return 0;
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
            this.screenWidth = window.innerWidth;
            this.updateSearchInputMaxWidth();
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
        setIsMouseInAiSearchToggle(newIsMouseInAiSearchToggle: boolean) {
            this.isMouseInAiSearchToggle = newIsMouseInAiSearchToggle;
        },
        setIsSuggestVisible(newVisibility: boolean) {
            this.isSuggestVisible = newVisibility;
        },
        setIsAiSuggestVisible(newVisibility: boolean) {
            this.isAiSuggestVisible = newVisibility;
        },
        setIsAiChatVisible(newVisibility: boolean) {
            this.isAiChatVisible = newVisibility;
        },
        toggleSearchOptionsBarVisibility() {
            this.isSearchOptionsBarVisible = !this.isSearchOptionsBarVisible;
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
    },
});
