import { defineStore } from 'pinia';
import { DictList, ExploreStepResult } from 'src/stores/resultStore';

export const useExploreStore = defineStore('explore', {
    state: () => ({
        stepResults: [] as ExploreStepResult[],
        latestHitsResult: {} as ExploreStepResult,
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
        isHitsValidArray(hits: DictList): boolean {
            return Array.isArray(hits) && hits.length > 0;
        },
        updateLatestHitsResult(stepResult: ExploreStepResult) {
            if (this.isHitsValidArray(stepResult.output.hits)) {
                this.latestHitsResult = stepResult;
            }
        },
        pushNewStepResult(stepResult: ExploreStepResult) {
            // console.log('pushNewStepResult:', stepResult);
            this.stepResults.push(stepResult);
            this.updateLatestHitsResult(stepResult);
            // this.pushFlowNode(stepResult);
        },
    }
}
);
