import { defineStore } from 'pinia';
import { getRouter } from 'src/router';

export const useQueryStore = defineStore('query', {
    state: () => ({
        query: '' as string,
    }),
    actions: {
        setRoute: (newQuery: string, mode?: string) => {
            const router = getRouter();
            const params = new URLSearchParams();
            params.set('q', newQuery);
            if (mode && mode !== 'direct') {
                params.set('mode', mode);
            }
            const newRoute = `/search?${params.toString()}`;
            const currentPath = router.currentRoute.value.fullPath;
            if (currentPath !== newRoute) {
                router.replace(newRoute);
            }
        },
        setQuery({
            newQuery = '',
            setRoute = false,
            mode,
        }: { newQuery: string, setRoute?: boolean, mode?: string }) {
            this.query = newQuery;
            if (setRoute) {
                this.setRoute(newQuery, mode);
            }
        },
    },
});
