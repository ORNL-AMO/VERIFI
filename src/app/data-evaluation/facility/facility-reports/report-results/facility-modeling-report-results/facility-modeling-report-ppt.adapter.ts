import { inject, Injectable } from '@angular/core';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { PptSlide, TableSlide, TitleSlide } from 'src/app/shared/ppt-report/models/ppt-slide';
import { IdbFacilityReport, ModelingReportSettings } from 'src/app/models/idbModels/facilityReport';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { UserDefineModelDateRangePipe } from 'src/app/shared/shared-analysis/data-check/regression-model-details-table/user-define-model-date-range.pipe';
import { RegressionNumberPipe } from 'src/app/shared/helper-pipes/regression-number.pipe';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';

export interface FacilityModelingReportPptInput {
    report: IdbFacilityReport;
    executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
}

@Injectable({ providedIn: 'root' })
export class FacilityModelingReportPptAdapter {
    customNumberPipe = inject(CustomNumberPipe);
    utilityMeterGroupDbService = inject(UtilityMeterGroupdbService);
    facilitydbService = inject(FacilitydbService);
    userDefinedModelDateRange = inject(UserDefineModelDateRangePipe);
    regressionNumberPipe = inject(RegressionNumberPipe);

    reportSettings: ModelingReportSettings;
    facility: IdbFacility;
    regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
    criticalItems: Array<FacilityGroupAnalysisItem> = [];
    moderateItems: Array<FacilityGroupAnalysisItem> = [];
    minorItems: Array<FacilityGroupAnalysisItem> = [];
    classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = [];
    absoluteGroupItems: Array<FacilityGroupAnalysisItem> = [];

    buildDocument(data: FacilityModelingReportPptInput): PptDocument {
        const slides: PptSlide[] = [];
        this.reportSettings = data.report.modelingReportSettings;
        this.facility = this.facilitydbService.getFacilityById(data.report.facilityId);
        slides.push({
            type: 'title',
            title: data.report.name,
            subtitle: this.facility.name,
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

        if (data.executiveSummaryItems.length > 0) {
            if (this.reportSettings.includeIssuesSummary) {
                const titleSlide = this.buildTitleSlide('Issues Summary');
                slides.push(titleSlide);
                if (this.regressionGroupItems.length > 0) {
                    if (this.criticalItems.length > 0) {
                        const tableSlide = this.buildCriticalIssuesSlides();
                        if (tableSlide) {
                            slides.push(tableSlide);
                        }
                    }
                    if (this.moderateItems.length > 0) {
                        const tableSlide = this.buildModerateIssuesSlides();
                        if (tableSlide) {
                            slides.push(tableSlide);
                        }
                    }
                    if (this.minorItems.length > 0) {
                        const tableSlide = this.buildMinorIssuesSlides();
                        if (tableSlide) {
                            slides.push(tableSlide);
                        }
                    }
                }
                if (this.regressionGroupItems.length === 0) {
                    slides.push({
                        type: 'title',
                        title: 'Issues Summary Not Available',
                        layout: 'section'
                    });
                }
                else if (this.criticalItems.length === 0 && this.moderateItems.length === 0 && this.minorItems.length === 0) {
                    slides.push({
                        type: 'title',
                        title: 'No Issues Found',
                        subtitle: ''
                    });
                }
            }

            if (this.reportSettings.includeExecutiveSummary) {
                const titleSlide = this.buildTitleSlide('Executive Summary');
                if (titleSlide) {
                    slides.push(titleSlide);
                }
                if (this.regressionGroupItems.length > 0) {
                    const tableSlide = this.buildModelDetailsTable();
                    if (tableSlide) {
                        slides.push(tableSlide);
                    }
                }
                if (this.classicIntensityGroupItems.length > 0) {
                    const tableSlide = this.buildClassicIntensityTable();
                    if (tableSlide) {
                        slides.push(tableSlide);
                    }
                }
                if (this.absoluteGroupItems.length > 0) {
                    const tableSlide = this.buildAbsoluteTable();
                    if (tableSlide) {
                        slides.push(tableSlide);
                    }
                }
            }

            if (this.reportSettings.includeDataValidationTables) {
                const titleSlide = this.buildTitleSlide('Data Validation Tables');
                if (titleSlide) {
                    slides.push(titleSlide);
                }
                if (this.regressionGroupItems.length > 0) {
                    for (const item of this.regressionGroupItems) {
                        const tableSlide = this.buildModelDetailsTable(item);
                        if (tableSlide) {
                            slides.push(tableSlide);
                        }
                        const sepTableSlide = this.buildSEPValidationTable(item);
                        if (sepTableSlide) {
                            slides.push(sepTableSlide);
                        }
                    }
                }
                if (this.regressionGroupItems.length === 0) {
                    slides.push({
                        type: 'title',
                        title: 'Data Validation Tables Not Available',
                        layout: 'section'
                    });
                }
            }
        }

        return {
            metadata: { title: data.report.name, subtitle: this.facility.name },
            slides,
        };
    }

    private buildTitleSlide(title: string): TitleSlide {
        return {
            type: 'title',
            title,
            layout: 'section'
        };
    }

    private buildCriticalIssuesSlides(): TableSlide {
        const title: string = 'Critical Issues';
        const headers: Array<string> = ['Facility', 'Group', 'Model Validation Failures'];
        let rows: string[][] = [];
        this.criticalItems.forEach(item => {
            let row: string[] = [];
            row.push(this.facility.name);
            row.push(this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId) || '-');
            row.push(item.selectedModel.modelValidationNotes.join('\n'));
            rows.push(row);
        });
        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildModerateIssuesSlides(): TableSlide {
        const title: string = 'Moderate Issues';
        const headers: Array<string> = ['Facility', 'Group', 'Data Validation Failures'];
        let rows: string[][] = [];
        this.moderateItems.forEach(item => {
            let row: string[] = [];
            row.push(this.facility.name);
            row.push(this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId) || '-');
            row.push(item.selectedModel.dataValidationNotes.join('\n'));
            rows.push(row);
        });
        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildMinorIssuesSlides(): TableSlide {
        const title: string = 'Minor Issues';
        const headers: Array<string> = ['Facility', 'Group', 'Model Notes'];
        let rows: string[][] = [];
        this.minorItems.forEach(item => {
            let row: string[] = [];
            row.push(this.facility.name);
            row.push(this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId) || '-');
            row.push(item.selectedModel.modelNotes.join('\n'));
            rows.push(row);
        });
        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildModelDetailsTable(item?: FacilityGroupAnalysisItem): TableSlide {
        let title: string = 'Analysis Type: Regression';
        const headers: Array<string> = ['Facility', 'Group', 'Model Year', 'Variable p-Values', 'R2', 'Adjusted R2', 'Model p-Value', 'Formula', 'Model Notes'];
        const rows: string[][] = [];
        let filteredRegressionItems: Array<FacilityGroupAnalysisItem> = this.regressionGroupItems;
        if (item) {
            title = this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId);
            filteredRegressionItems = [item];
        }

        filteredRegressionItems.forEach(item => {
            const row: string[] = [];
            const groupName = item.selectedModel?.isUserDefinedModel
                ? `${this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId)} *`
                : this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId);

            const modelYear = item.selectedModel?.isUserDefinedModel
                ? this.userDefinedModelDateRange.transform(item.group)
                : item.group.regressionModelYear.toString();

            let variablePValues = '—';
            let r2 = '—';
            let adjustedR2 = '—';
            let modelPValue = '—';

            if (!item.selectedModel?.isUserDefinedModel && !item.selectedModel?.errorModeling) {
                const pValueLines = (item.selectedModel?.t?.p ?? [])
                    .slice(1)
                    .map((pValue, index) => `${item.selectedModel?.predictorVariables[index]?.name}: ${this.formatFixed(pValue, 2)}`);

                variablePValues = pValueLines.length ? pValueLines.join('\n') : '—';
                r2 = this.formatFixed(item.selectedModel?.R2, 3);
                adjustedR2 = this.formatFixed(item.selectedModel?.adjust_R2, 3);
                modelPValue = this.formatFixed(item.selectedModel?.modelPValue, 2);
            }

            const formula = this.buildFormula(item);
            const modelNotes = item.selectedModel?.modelNotes?.length ? item.selectedModel.modelNotes.join('\n') : '—';

            row.push(this.facility.name);
            row.push(groupName || '-');
            row.push(modelYear);
            row.push(variablePValues);
            row.push(r2);
            row.push(adjustedR2);
            row.push(modelPValue);
            row.push(formula);
            row.push(modelNotes);
            rows.push(row);
        });

        return {
            type: 'table',
            title,
            headers,
            rows,
            note: this.hasUserDefinedModel() ? '* User Defined Model' : ''
        };
    }

    private buildClassicIntensityTable(): TableSlide {
        const title: string = 'Analysis Type: Classic Intensity';
        const headers: Array<string> = ['Facility', 'Group', 'Baseline Year', 'Predictor Variables'];
        const rows: string[][] = [];
        this.classicIntensityGroupItems.forEach(item => {
            const row: string[] = [];
            row.push(this.facility.name);
            row.push(this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId) || '-');
            row.push(item.baselineYear.toString());
            let predictorVariables: string = '';
            item.group.predictorVariables?.forEach(predictor => {
                if (predictor.productionInAnalysis) {
                    predictorVariables += predictor.name + '\n';
                }
            });
            row.push(predictorVariables || '—');
            rows.push(row);
        });
        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildAbsoluteTable(): TableSlide {
        const title: string = 'Analysis Type: Absolute';
        const headers: Array<string> = ['Facility', 'Group', 'Baseline Year'];
        const rows: string[][] = [];
        this.absoluteGroupItems.forEach(item => {
            const row: string[] = [];
            row.push(this.facility.name);
            row.push(this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId) || '-');
            row.push(item.baselineYear.toString());
            rows.push(row);
        });
        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildSEPValidationTable(item: FacilityGroupAnalysisItem): TableSlide {
        const title: string = this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId);
        let headers: Array<string> = ['', ''];
        item.selectedModel?.SEPValidation?.forEach(variable => {
            headers.push(variable.predictorVariable);
        });
        let rows: string[][] = [];

        let meanReportYearValues: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            meanReportYearValues.push(this.formatValue(sepValidation.meanReportYear, false));
        });
        rows.push([
            '',
            'Mean report Year Value',
            ...meanReportYearValues
        ]);

        let meanBaselineYearValues: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            meanBaselineYearValues.push(this.formatValue(sepValidation.meanBaselineYear, false));
        });
        rows.push([
            '',
            'Mean baseline Year Value',
            ...meanBaselineYearValues
        ]);

        let range1MinValues: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            range1MinValues.push(this.formatValue(sepValidation.modelMin, false));
        });
        rows.push([
            'Range 1',
            'Minimum of Model Variable',
            ...range1MinValues
        ]);

        let range1MaxValues: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            range1MaxValues.push(this.formatValue(sepValidation.modelMax, false));
        });
        rows.push([
            '',
            'Maximum of Model Variable',
            ...range1MaxValues
        ]);

        let range2MinValues: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            range2MinValues.push(this.formatValue(sepValidation.modelMinus3StdDev, false));
        });
        rows.push([
            'Range 2',
            'Model Mean -3 Std Dev',
            ...range2MinValues
        ]);

        let range2MaxValues: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            range2MaxValues.push(this.formatValue(sepValidation.modelPlus3StdDev, false));
        });
        rows.push([
            '',
            'Model Mean +3 Std Dev',
            ...range2MaxValues
        ]);

        let validationCheckRow: string[] = [];
        item.selectedModel?.SEPValidation?.forEach(sepValidation => {
            validationCheckRow.push(sepValidation.isValid ? 'Pass' : 'Fail');
        });
        rows.push([
            '',
            'Validation Check',
            ...validationCheckRow
        ]);

        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildFormula(item: FacilityGroupAnalysisItem): string {
        const selectedModel = item.selectedModel;
        if (!selectedModel?.coef?.length) {
            return '—';
        }

        const terms = selectedModel.coef.map((coef, index) => {
            const coefText = this.regressionNumberPipe.transform(coef);
            if (index === 0) {
                return `${coefText}`;
            }
            const predictor = selectedModel.predictorVariables?.[index - 1]?.name ?? '';
            return `(${coefText}*${predictor})`;
        });

        return terms.join(' + ');
    }

    private formatFixed(value: number, fractionDigits: number): string {
        if (value === null || value === undefined || Number.isNaN(value)) {
            return '—';
        }
        return value.toLocaleString(undefined, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
    }

    private formatValue(value: number, isCurrrency: boolean): string {
        if (value === null || isNaN(value) || value === 0 || value === undefined)
            return '—';
        return this.customNumberPipe.transform(value, isCurrrency);
    }

    private hasUserDefinedModel(): boolean {
        return this.regressionGroupItems.some(item => item.selectedModel?.isUserDefinedModel);
    }
}