import { defineStore } from 'pinia';
import { ExploreStepResult, defaultExploreStepResult } from 'src/stores/resultStore';


export const useExploreStore = defineStore('explore', {
    state: () => ({
        currentStepResultDict: defaultExploreStepResult(),
    }),
    getters: {
    },
    actions: {
        pushNewStepResult(stepResult: ExploreStepResult) {
            console.log('pushNewStepResult:', stepResult);
            if (stepResult.name === 'most_relevant_search') {
                this.currentStepResultDict = stepResult;
            }
        }
    }
}
);
