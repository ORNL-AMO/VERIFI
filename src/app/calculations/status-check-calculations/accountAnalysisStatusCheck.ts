import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { AnalysisSetupErrors } from "src/app/models/validation";
import { FacilityStatusCheck } from "./facilityStatusCheck";
import { getAccountAnalysisSetupErrors } from "./validation/accountAnalysisValidation";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
import { AnalysisStatusCheck } from "./analysisStatusCheck";


export class AccountAnalysisStatusCheck {

    analysisItemId: string;
    accountAnalysisSetupErrors: AccountAnalysisSetupErrors;
    status: STATUS_CHECK_OPTIONS;

    /** The most recent data date across all meters and predictors used in the analysis. */
    latestDataDate: Date;
    /** The most recent same day/month across all meters and predictors used in the analysis */
    latestDataAllEntries: Date;
    /** latest complete year of data */
    latestCompleteYear: number;

    /** True when every meter and predictor has data up to the same month/year as latestDataDate. */
    allDatesCurrent: boolean;
    facilityAnalysisHasWarnings: boolean;

    constructor(analysisItem: IdbAccountAnalysisItem, facilityStatusChecks: Array<FacilityStatusCheck>, account: IdbAccount) {
        this.analysisItemId = analysisItem.guid;
        const facilityAnalysisItemIds: Set<string> = new Set(
            analysisItem.facilityAnalysisItems
                .map(facilityAnalysisItem => facilityAnalysisItem.analysisItemId)
                .filter((analysisItemId): analysisItemId is string => analysisItemId !== undefined && analysisItemId !== null)
        );
        const facilityAnalysisStatusChecks: Array<AnalysisStatusCheck> = facilityStatusChecks.flatMap(fc => fc.analysisStatusChecks)
        const includedFacilityAnalysisStatusChecks: Array<AnalysisStatusCheck> = facilityAnalysisStatusChecks.filter(fc => facilityAnalysisItemIds.has(fc.analysisItem.guid));
        this.setAnalysisSetupErrors(includedFacilityAnalysisStatusChecks, analysisItem);
        this.setDates(includedFacilityAnalysisStatusChecks, account);
        this.setStatus(includedFacilityAnalysisStatusChecks);
    }

    private setAnalysisSetupErrors(facilityAnalysisStatusChecks: Array<AnalysisStatusCheck>, analysisItem: IdbAccountAnalysisItem) {
        const analysisSetupErrors: Array<AnalysisSetupErrors> = facilityAnalysisStatusChecks.map(fc => fc.analysisSetupErrors);
        const errors = getAccountAnalysisSetupErrors(analysisItem, analysisSetupErrors);
        this.accountAnalysisSetupErrors = errors;
    }

    private setDates(facilityAnalysisStatusChecks: Array<AnalysisStatusCheck>, account: IdbAccount) {
        const latestDataDates: Array<Date> = facilityAnalysisStatusChecks.map(fc => fc.latestDataDate).filter((date): date is Date => date !== undefined);
        this.latestDataDate = latestDataDates.length > 0 ? new Date(Math.max(...latestDataDates.map(date => date.getTime()))) : undefined;

        const latestDataAllEntriesDates: Array<Date> = facilityAnalysisStatusChecks.map(fc => fc.latestDataAllEntries).filter((date): date is Date => date !== undefined);
        this.latestDataAllEntries = latestDataAllEntriesDates.length > 0 ? new Date(Math.min(...latestDataAllEntriesDates.map(date => date.getTime()))) : undefined;

        if (this.latestDataAllEntries) {
            if (account.fiscalYear === 'calendarYear') {
                if(this.latestDataAllEntries.getMonth() === 11) {
                    this.latestCompleteYear = this.latestDataAllEntries.getFullYear();
                } else {
                    this.latestCompleteYear = this.latestDataAllEntries.getFullYear() - 1;
                }
            } else if(account.fiscalYearCalendarEnd) {
                //fiscal year ends in the fiscalYearMonth
                if(account.fiscalYearMonth){
                    if(this.latestDataAllEntries.getMonth() === (account.fiscalYearMonth - 1 + 12) % 12) {
                        this.latestCompleteYear = this.latestDataAllEntries.getFullYear();
                    } else {
                        this.latestCompleteYear = this.latestDataAllEntries.getFullYear() - 1;
                    }
                }
            } else if(!account.fiscalYearCalendarEnd){
                //fiscal year starts in the fiscalYearMonth
                if(account.fiscalYearMonth){
                    if(this.latestDataAllEntries.getMonth() === (account.fiscalYearMonth - 2 + 12) % 12) {
                        this.latestCompleteYear = this.latestDataAllEntries.getFullYear();
                    } else {
                        this.latestCompleteYear = this.latestDataAllEntries.getFullYear() - 1;
                    }
                }
            }
            //year/month equal
            this.allDatesCurrent = this.latestDataDate !== undefined && this.latestDataDate.getFullYear() === this.latestDataAllEntries.getFullYear() && this.latestDataDate.getMonth() === this.latestDataAllEntries.getMonth();
        }
    }

    private setStatus(includedFacilityAnalysisStatusChecks: Array<AnalysisStatusCheck>) {
        this.facilityAnalysisHasWarnings = includedFacilityAnalysisStatusChecks.some(fc => fc.status === 'warning');

        if (this.accountAnalysisSetupErrors.hasError) {
            this.status = 'error';
        } else if (this.facilityAnalysisHasWarnings) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }
}