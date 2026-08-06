import { inject, Injectable } from '@angular/core';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { PptSlide } from 'src/app/shared/ppt-report/models/ppt-slide';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { FacilityModelingReportPptAdapter } from 'src/app/data-evaluation/facility/facility-reports/report-results/facility-modeling-report-results/facility-modeling-report-ppt.adapter';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';

export interface AnalysisReportPptInput {
    account: IdbAccount;
    report: IdbAccountReport;
    executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
    facilityAnalysisItems: Array<IdbAnalysisItem>;
}

@Injectable({ providedIn: 'root' })
export class AnalysisReportPptAdapter {
    private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
    facilityModelingReportPptAdapter = inject(FacilityModelingReportPptAdapter);

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

        if (data.facilityAnalysisItems && data.facilityAnalysisItems.length > 0 && data.executiveSummaryItems && data.executiveSummaryItems.length > 0) {
            if (this.reportSettings.includeProblemsInformation) {
                const titleSlide = this.facilityModelingReportPptAdapter.buildTitleSlide('Issues Summary');
                if (titleSlide) {
                    slides.push(titleSlide);
                }
                if (this.regressionGroupItems?.length > 0) {
                    if (this.criticalItems?.length > 0) {
                        slides.push(this.facilityModelingReportPptAdapter.buildCriticalIssuesSlides(this.criticalItems));
                    }
                    if (this.moderateItems?.length > 0) {
                        slides.push(this.facilityModelingReportPptAdapter.buildModerateIssuesSlides(this.moderateItems));
                    }
                    if (this.minorItems?.length > 0) {
                        slides.push(this.facilityModelingReportPptAdapter.buildMinorIssuesSlides(this.minorItems));
                    }
                }
                if (this.regressionGroupItems?.length === 0) {
                    slides.push(this.facilityModelingReportPptAdapter.buildTitleSlide('Issues Summary Not Available'));
                }
                if (this.regressionGroupItems?.length > 0 && this.criticalItems?.length === 0 && this.moderateItems?.length === 0 && this.minorItems?.length === 0) {
                    slides.push(this.facilityModelingReportPptAdapter.buildTitleSlide('No Issues Found'));
                }
            }

            if (this.reportSettings.includeExecutiveSummary) {
                slides.push(this.facilityModelingReportPptAdapter.buildTitleSlide('Executive Summary'));
                if (this.regressionGroupItems?.length > 0) {
                    slides.push(this.facilityModelingReportPptAdapter.buildModelDetailsTable(this.regressionGroupItems, false));
                }
                if (this.classicIntensityGroupItems?.length > 0) {
                    slides.push(this.facilityModelingReportPptAdapter.buildClassicIntensityTable(this.classicIntensityGroupItems));
                }
                if (this.absoluteGroupItems?.length > 0) {
                    slides.push(this.facilityModelingReportPptAdapter.buildAbsoluteTable(this.absoluteGroupItems));
                }
            }

            if (this.reportSettings.includeDataValidationTables) {
                slides.push(this.facilityModelingReportPptAdapter.buildTitleSlide('Data Validation Summary'));
                let itemsByFacility = new Map<string, FacilityGroupAnalysisItem[]>();
                for (const item of this.regressionGroupItems) {
                    const existing = itemsByFacility.get(item.facilityId) || [];
                    existing.push(item);
                    itemsByFacility.set(item.facilityId, existing);
                }

                if (itemsByFacility?.size > 0) {
                    for (const [facilityId, items] of itemsByFacility.entries()) {
                        const facilityName = this.accountWorkspaceQuery.getFacilityByGuid(facilityId)?.name || '-';
                        slides.push(this.facilityModelingReportPptAdapter.buildTitleSlide(facilityName));
                        
                        for (const item of items) {
                            slides.push(this.facilityModelingReportPptAdapter.buildModelDetailsTable([item], true));
                            slides.push(this.facilityModelingReportPptAdapter.buildSEPValidationTable(item));
                        }
                    }
                }
                if (itemsByFacility?.size === 0) {
                    slides.push(this.facilityModelingReportPptAdapter.buildTitleSlide('Data Validation Tables Not Available'));
                }
            }
        }

        return {
            metadata: { title: data.report.name },
            slides,
        };
    }
}