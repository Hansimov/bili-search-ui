import { defineStore } from 'pinia';
import { Dict, DictList, ExploreStepResult, ExploreSession, isNonEmptyArray, isNonEmptyDict } from 'src/stores/resultStore';
import { useQueryStore } from './queryStore';
const queryStore = useQueryStore();


export const useExploreStore = defineStore('explore', {
    state: () => ({
        stepResults: [] as ExploreStepResult[],
        latestHitsResult: {} as ExploreStepResult,
        latestAuthorsResult: {} as ExploreStepResult,
        authorFilters: [] as DictList,
        exploreSessions: [] as ExploreSession[],
        currentSessionIdx: -1,
        isExploreLoading: false,
        submittedQuery: '' as string,
        isRestoringSession: false,
    }),
    getters: {
        currentStepResult(): ExploreStepResult | undefined {
            if (this.stepResults.length > 0) {
                return this.stepResults[this.stepResults.length - 1];
            } else {
                return undefined;
            }
        },
        hasResults(): boolean {
            return isNonEmptyArray(this.latestHitsResult?.output?.hits);
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
        saveExploreSession() {
            // ensure not keeping "future" sessions if user branches off
            if (this.currentSessionIdx < this.exploreSessions.length - 1) {
                this.exploreSessions.splice(this.currentSessionIdx + 1);
            }
            this.exploreSessions.push({
                query: queryStore.query,
                stepResults: [...this.stepResults],
                latestHitsResult: this.latestHitsResult,
                latestAuthorsResult: this.latestAuthorsResult,
                authorFilters: [...this.authorFilters],
            });
            this.currentSessionIdx = this.exploreSessions.length - 1;
        },
        restoreSession() {
            this.isRestoringSession = true;
            const session = this.exploreSessions[this.currentSessionIdx];
            queryStore.setQuery({ newQuery: session.query, setRoute: true });
            this.stepResults = [...session.stepResults];
            this.latestHitsResult = session.latestHitsResult;
            this.latestAuthorsResult = session.latestAuthorsResult;
            this.authorFilters = [...session.authorFilters];
            this.submittedQuery = session.query;
            // Reset the flag after a short delay to allow route watcher to see it
            setTimeout(() => {
                this.isRestoringSession = false;
            }, 100);
        },
        clearSession() {
            const session = this.exploreSessions[this.currentSessionIdx];
            this.exploreSessions = [session];
            this.currentSessionIdx = 0;
        },
        isSessionHasPrev() {
            return this.currentSessionIdx > 0;
        },
        isSessionHasNext() {
            return this.currentSessionIdx < this.exploreSessions.length - 1;
        },
        isSessionSwitchVisible() {
            return this.exploreSessions.length > 1;
        },
        toPrevSession() {
            if (!this.isSessionHasPrev()) return;
            this.currentSessionIdx--;
            this.restoreSession();
        },
        toNextSession() {
            if (!this.isSessionHasNext()) return;
            this.currentSessionIdx++;
            this.restoreSession();
        },
        pushNewStepResult(stepResult: ExploreStepResult) {
            // console.log('pushNewStepResult:', stepResult);
            this.stepResults.push(stepResult);
            this.updateLatestHitsResult(stepResult);
            this.updateLatestAuthorsResult(stepResult);
            // this.pushFlowNode(stepResult);
        },
        setStepResults(stepResults: ExploreStepResult[]) {
            // Clear previous results and set new batch of step results
            this.stepResults = [];
            this.latestHitsResult = {} as ExploreStepResult;
            this.latestAuthorsResult = {} as ExploreStepResult;
            // Process each step result in order
            for (const stepResult of stepResults) {
                this.stepResults.push(stepResult);
                this.updateLatestHitsResult(stepResult);
                this.updateLatestAuthorsResult(stepResult);
            }
        },
        clearStepResults() {
            this.stepResults = [];
            this.latestHitsResult = {} as ExploreStepResult;
            this.latestAuthorsResult = {} as ExploreStepResult;
        },
        setExploreLoading(loading: boolean) {
            this.isExploreLoading = loading;
        },
        setSubmittedQuery(query: string) {
            this.submittedQuery = query;
        },
        setRestoringSession(restoring: boolean) {
            this.isRestoringSession = restoring;
        },
    }
}
);
