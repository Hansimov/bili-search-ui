import { useSearchStore } from '../stores/searchStore';
import { Router } from 'vue-router';

export const submitAiQuery = async (aiQueryValue: string, router: Router, isFromURL = false, setSearchStoreAiQuery = true) => {
    const searchStore = useSearchStore();
    searchStore.setIsSuggestVisible(false);
    if (aiQueryValue) {
        if (setSearchStoreAiQuery) {
            searchStore.setAiQuery(aiQueryValue);
        }
        if (!isFromURL) {
        }
        try {
            console.log('> submit ai query:', aiQueryValue);

        } catch (error) {
            console.error(error);
        }
    }
};