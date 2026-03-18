import { AccountAnalysisSetupErrors } from "../accountAnalysis"
import { AnalysisCategory } from "../analysis"
import { IdbAccount } from "./account"
import { IdbFacility } from "./facility"
import { getNewIdbEntry, IdbEntry } from "./idbEntry"

export interface IdbAccountAnalysisItem extends IdbEntry {
    accountId: string,
    name: string,
    energyIsSource: boolean,
    calculatedReportYear: number,
    energyUnit: string,
    facilityAnalysisItems: Array<{
        facilityId: string,
        analysisItemId: string
    }>,
    analysisCategory: AnalysisCategory,
    waterUnit: string,
    baselineYear: number,
    setupErrors: AccountAnalysisSetupErrors,
    facilityItemsInitialized?: boolean,
    hasBanking: boolean,
    isAnalysisVisited: boolean
}

export function getNewIdbAccountAnalysisItem(analysisCategory: AnalysisCategory, account: IdbAccount, accountFacilities: Array<IdbFacility>): IdbAccountAnalysisItem {
    let idbEntry: IdbEntry = getNewIdbEntry();

    let facilityAnalysisItems: Array<{
        facilityId: string,
        analysisItemId: string
    }> = new Array();
    accountFacilities.forEach(facility => {
        facilityAnalysisItems.push({
            facilityId: facility.guid,
            analysisItemId: undefined
        })
    });
    let baselineYear: number = account.sustainabilityQuestions.energyReductionBaselineYear;
    if (analysisCategory == 'water') {
        baselineYear = account.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return {
        ...idbEntry,
        accountId: account.guid,
        name: 'Account Analysis',
        calculatedReportYear: undefined,
        baselineYear: baselineYear,
        energyUnit: account.energyUnit,
        facilityAnalysisItems: facilityAnalysisItems,
        energyIsSource: account.energyIsSource,
        waterUnit: account.volumeLiquidUnit,
        analysisCategory: analysisCategory,
        hasBanking: false,
        isAnalysisVisited: false,
        setupErrors: {
            hasError: true,
            missingName: false,
            missingBaselineYear: false,
            facilitiesSelectionsInvalid: true
        }
    }
}