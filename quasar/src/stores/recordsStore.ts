import { defineStore } from 'pinia';
export const useRecordsStore = defineStore('records', {
    state: () => ({
        isSearchRecordsVisible: false
    }),
    actions: {
        toggleSearchRecordsList() {
            this.isSearchRecordsVisible = !this.isSearchRecordsVisible
        }
    }
})