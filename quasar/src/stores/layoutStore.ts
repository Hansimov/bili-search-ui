import { defineStore } from 'pinia';

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        isSearchRecordsVisible: false,
        screenWidth: window.innerWidth,
        searchRecordsListWidth: 300
    }),
    actions: {
        toggleSearchRecordsList() {
            this.isSearchRecordsVisible = !this.isSearchRecordsVisible
        },
        updateScreenWidth() {
            this.screenWidth = window.innerWidth;
        },
        updateDrawerWidth(newWidth: number) {
            this.searchRecordsListWidth = newWidth;
        },
        addWindowResizeListener() {
            window.addEventListener('resize', this.updateScreenWidth);
        },
        removeWindowResizeListener() {
            window.removeEventListener('resize', this.updateScreenWidth);
        },
        availableContentWidth() {
            if (this.isSearchRecordsVisible && typeof this.searchRecordsListWidth === 'number') {
                return this.screenWidth - this.searchRecordsListWidth;
            } else {
                return this.screenWidth;
            }
        },
        isSmallScreen() {
            return this.availableContentWidth() < 520;
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
