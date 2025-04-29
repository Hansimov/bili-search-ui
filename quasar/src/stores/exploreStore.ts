import { defineStore } from 'pinia';
import { Dict, DictList, ExploreStepResult, isNonEmptyArray, isNonEmptyDict } from 'src/stores/resultStore';

export const useExploreStore = defineStore('explore', {
    state: () => ({
        stepResults: [] as ExploreStepResult[],
        latestHitsResult: {} as ExploreStepResult,
        latestAuthorsResult: {} as ExploreStepResult,
        authorFilters: [] as DictList,
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
        setAuthorFilters(authorFilters: DictList) {
            this.authorFilters = authorFilters;
        },
        removeAuthorFilter(authorFilter: Dict) {
            const index = this.authorFilters.findIndex((filter) => filter.mid === authorFilter.mid);
            if (index !== -1) {
                this.authorFilters.splice(index, 1);
            }
        },
        clearAuthorFilters() {
            this.authorFilters = [];
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
