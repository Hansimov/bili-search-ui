import { defineStore } from 'pinia';

export const useQueryStore = defineStore('query', {
    state: () => ({
        query: '' as string,
    }),
    actions: {
        setQuery(newQuery: string) {
            this.query = newQuery;
        },
    },
});
