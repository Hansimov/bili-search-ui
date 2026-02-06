import { defineStore } from 'pinia';

/** 侧边栏宽度常量 */
const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 50;

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
        /** 移动端侧边栏是否打开 */
        isMobileSidebarOpen: false,
    }),
    actions: {
        isDesktopMode() {
            return this.screenWidth >= 1024;
        },
        /** 获取侧边栏当前宽度 */
        sidebarWidth(): number {
            return this.isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
        },
        isSearchRecordsListHasWidth() {
            // 侧边栏始终可见，始终有宽度
            return this.isDesktopMode();
        },
        availableContentWidth() {
            if (this.isDesktopMode()) {
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
        /** 切换移动端侧边栏 */
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
            if (this.isDesktopMode()) {
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
