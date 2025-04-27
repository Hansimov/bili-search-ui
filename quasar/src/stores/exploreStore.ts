import { defineStore } from 'pinia';
import { ExploreStepResult, isNonEmptyArray, isNonEmptyDict } from 'src/stores/resultStore';

export const useExploreStore = defineStore('explore', {
    state: () => ({
        stepResults: [] as ExploreStepResult[],
        latestHitsResult: {} as ExploreStepResult,
        latestAuthorsResult: {} as ExploreStepResult,
    }),
    getters: {
        currentStepResult(): ExploreStepResult | undefined {
            if (this.stepResults.length > 0) {
                return this.stepResults[this.stepResults.length - 1];
            } else {
                return undefined;
            }
        },
    },
    actions: {
        updateLatestHitsResult(stepResult: ExploreStepResult) {
            if (isNonEmptyArray(stepResult.output.hits)) {
                this.latestHitsResult = stepResult;
            }
        },
        updateLatestAuthorsResult(stepResult: ExploreStepResult) {
            if (isNonEmptyDict(stepResult.output.authors)) {
                this.latestAuthorsResult = stepResult;
            }
        },
        pushNewStepResult(stepResult: ExploreStepResult) {
            // console.log('pushNewStepResult:', stepResult);
            this.stepResults.push(stepResult);
            this.updateLatestHitsResult(stepResult);
            this.updateLatestAuthorsResult(stepResult);
            // this.pushFlowNode(stepResult);
        },
    }
}
);
