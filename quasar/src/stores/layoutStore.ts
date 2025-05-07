import { defineStore } from 'pinia';

export const useLayoutStore = defineStore('layout', {
    state: () => ({
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
    }),
    actions: {
        isDesktopMode() {
            // https://quasar.dev/layout/drawer/
            // screenWidth >= 1024: desktop
            // screenWidth <= 1023: mobile
            return this.screenWidth >= 1024;
        },
        isSearchRecordsListHasWidth() {
            return this.isSearchRecordsVisible && this.isDesktopMode() && typeof this.searchRecordsListWidth === 'number';
        },
        availableContentWidth() {
            if (this.isSearchRecordsListHasWidth()) {
                return this.screenWidth - this.searchRecordsListWidth;
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
        toggleSearchRecordsList() {
            this.isSearchRecordsVisible = !this.isSearchRecordsVisible
        },
        updateSearchInputMaxWidth() {
            let searchInputMaxWidth;
            if (this.isSearchRecordsListHasWidth()) {
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
    },
});
