import { defineStore } from 'pinia';

import { Dict } from 'src/stores/resultStore';

interface StepResult {
    step: number;
    name: string;
    input: Dict;
    output: Dict;
    comment: string;
}

export const useExploreStore = defineStore('explore', {
    state: () => ({
    }),
    getters: {
    },
    actions: {
        pushNewStepResult(stepResult: StepResult) {
            console.log('pushNewStepResult:', stepResult);
        }
    }
}
);
