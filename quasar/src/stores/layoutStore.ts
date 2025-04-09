import { defineStore } from 'pinia';

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        isSearchRecordsVisible: false,
        screenWidth: window.innerWidth,
        searchRecordsListWidth: 300
    }),
    actions: {
        isSearchRecordsListHasWidth() {
            return this.isSearchRecordsVisible && typeof this.searchRecordsListWidth === 'number';
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
        dynamicResultsListClass() {
            if (this.isSmallScreen()) {
                return 'q-gutter-none results-list';
            } else {
                return 'q-gutter-xs results-list';
            }
        },
        dynamicResultsListStyle() {
            return {
                maxWidth: `${Math.min(this.availableContentWidth(), 1280)}px`,
            }
        }
    },
});
