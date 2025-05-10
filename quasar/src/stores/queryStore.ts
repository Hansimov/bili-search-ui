import { defineStore } from 'pinia';
import { getRouter } from 'src/router';

export const useQueryStore = defineStore('query', {
    state: () => ({
        query: '' as string,
    }),
    actions: {
        setRoute: (newQuery: string) => {
            const newRoute = `/search?q=${encodeURIComponent(newQuery)}`;
            const router = getRouter();
            const currentPath = router.currentRoute.value.fullPath;
            if (currentPath !== newRoute) {
                router.replace(newRoute);
            }
        },
        setQuery({
            newQuery = '',
            setRoute = false,
        }: { newQuery: string, setRoute?: boolean }) {
            this.query = newQuery;
            if (setRoute) {
                this.setRoute(newQuery);
            }
        },
    },
});
