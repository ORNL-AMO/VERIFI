import { inject, Injectable } from '@angular/core';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { PptSlide } from 'src/app/shared/ppt-report/models/ppt-slide';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { UserDefineModelDateRangePipe } from 'src/app/shared/shared-analysis/data-check/regression-model-details-table/user-define-model-date-range.pipe';
import { RegressionNumberPipe } from 'src/app/shared/helper-pipes/regression-number.pipe';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

export interface AnalysisReportPptInput {
    account: IdbAccount;
    report: IdbAccountReport;
    executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
    facilityAnalysisItems: Array<IdbAnalysisItem>;
}

@Injectable({ providedIn: 'root' })
export class AnalysisReportPptAdapter {
    customNumberPipe = inject(CustomNumberPipe);
    utilityMeterGroupDbService = inject(UtilityMeterGroupdbService);
    facilitydbService = inject(FacilitydbService);
    userDefinedModelDateRange = inject(UserDefineModelDateRangePipe);
    regressionNumberPipe = inject(RegressionNumberPipe);

    reportSettings: AnalysisReportSetup;
    regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
    criticalItems: Array<FacilityGroupAnalysisItem> = [];
    moderateItems: Array<FacilityGroupAnalysisItem> = [];
    minorItems: Array<FacilityGroupAnalysisItem> = [];
    classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = [];
    absoluteGroupItems: Array<FacilityGroupAnalysisItem> = [];

    buildDocument(data: AnalysisReportPptInput): PptDocument {
        const slides: PptSlide[] = [];
        this.reportSettings = data.report.analysisReportSetup;
        slides.push({
            type: 'title',
            title: data.report.name,
            subtitle: data.account.name ?? '',
            date: new Date().toISOString(),
        });

        this.regressionGroupItems = data.executiveSummaryItems.filter(item => {
            return item.group.analysisType == 'regression';
        });

        this.criticalItems = this.regressionGroupItems.filter(item => {
            return (item.group.analysisType == 'regression' && !item.selectedModel.isValid);
        });

        this.moderateItems = this.regressionGroupItems.filter(item => {
            return (item.group.analysisType == 'regression' && !item.selectedModel.SEPValidationPass && item.selectedModel.dataValidationNotes && item.selectedModel.dataValidationNotes.length > 0);
        });

        this.minorItems = this.regressionGroupItems.filter(item => {
            return (item.group.analysisType == 'regression' && item.selectedModel.modelNotes && item.selectedModel.modelNotes.length > 0);
        });

        this.classicIntensityGroupItems = data.executiveSummaryItems.filter(item => {
            return item.group.analysisType == 'energyIntensity';
        });

        this.absoluteGroupItems = data.executiveSummaryItems.filter(item => {
            return item.group.analysisType == 'absoluteEnergyConsumption';
        });
        return {
            metadata: { title: data.report.name },
            slides,
        };
    }
}