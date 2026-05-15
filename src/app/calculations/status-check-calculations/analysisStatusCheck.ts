import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { AnalysisGroup, JStatRegressionModel } from "src/app/models/analysis";
import { AnalysisSetupErrors, GroupAnalysisErrors } from "src/app/models/validation";
import * as _ from 'lodash';
import { MeterStatusCheck } from "./meterStatusCheck";
import { PredictorStatusCheck } from "./predictorStatusCheck";
import { AnalysisGroupStatusCheck } from "./analysisGroupStatusCheck";
import { getAnalysisSetupErrors } from "./validation/analysisValidation";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbFacility } from "src/app/models/idbModels/facility";

export class AnalysisStatusCheck {

    analysisItem: IdbAnalysisItem;
    /** The most recent data date across all meters and predictors used in the analysis. */
    latestDataDate: Date;
    /** The most recent same day/month across all meters and predictors used in the analysis */
    latestDataAllEntries: Date;
    /** True when every meter and predictor has data up to the same month/year as latestDataDate. */
    allDatesCurrent: boolean;

    analysisSetupErrors: AnalysisSetupErrors;
    groupStatusChecks: Array<AnalysisGroupStatusCheck>;

    includedMeterStatusChecks: Array<MeterStatusCheck>;
    includedPredictorStatusChecks: Array<PredictorStatusCheck>;

    hasSetupErrors: boolean;
    hasPredictorSetupErrors: boolean;
    hasMeterSetupErrors: boolean;

    status: 'good' | 'warning' | 'error';

    constructor(analysisItem: IdbAnalysisItem,
        meterStatusChecks: Array<MeterStatusCheck>,
        predictorStatusChecks: Array<PredictorStatusCheck>,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictorData: Array<IdbPredictorData>,
        facility: IdbFacility
    ) {
        this.analysisItem = analysisItem;
        this.setAnalysisGroupErrors(analysisItem.groups, predictorStatusChecks, meterStatusChecks, calanderizedMeters, predictorData);
        this.setAnalysisSetupErrors(calanderizedMeters, facility);
        this.setAnalysisDataDateCheck(analysisItem, meterStatusChecks, predictorStatusChecks);
        this.setPredictorSetupErrors();
        this.setMeterSetupErrors();
        this.setStatus();
    }

    private setAnalysisGroupErrors(
        groups: Array<AnalysisGroup>,
        predictorStatusChecks: Array<PredictorStatusCheck>,
        meterStatusChecks: Array<MeterStatusCheck>,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictorData: Array<IdbPredictorData>
    ) {
        this.groupStatusChecks = new Array();
        for (const group of groups) {
            if (group.analysisType !== 'skip' && group.analysisType !== 'skipAnalysis') {
                const groupStatusCheck = new AnalysisGroupStatusCheck(group, predictorStatusChecks, meterStatusChecks, this.analysisItem, calanderizedMeters, predictorData);
                this.groupStatusChecks.push(groupStatusCheck);
            }
        }
    }

    /**
    * Builds an AnalysisDataDateCheck for a single analysis item by examining
    * every regression group's meters and predictors and finding the latest
    * data entry date for each.
    */
    private setAnalysisDataDateCheck(
        analysisItem: IdbAnalysisItem,
        meterStatusChecks: Array<MeterStatusCheck>,
        predictorStatusChecks: Array<PredictorStatusCheck>
    ) {
        const { includedMeterIds, includedPredictorIds } = this.collectRegressionGroupInputIds(analysisItem.groups, meterStatusChecks);
        this.includedPredictorStatusChecks = includedPredictorIds.map(predictorId =>
            this.getPredictorDateEntry(predictorId, predictorStatusChecks)
        );
        const latestPredictorDates: Array<Date> = this.includedPredictorStatusChecks.map(d => d.latestEntryDate);

        this.includedMeterStatusChecks = includedMeterIds.map(meterId =>
            this.getMeterDateEntry(meterId, meterStatusChecks)
        );
        const latestMeterData: Array<Date> = this.includedMeterStatusChecks.map(d => d.lastDateEntry);

        const allDates: Array<Date> = [
            ...latestPredictorDates,
            ...latestMeterData
        ];
        if (allDates.length === 0) {
            this.latestDataDate = undefined;
            this.allDatesCurrent = false;
            this.latestDataAllEntries = undefined;
            return;
        }
        const maxDate: Date = _.max(allDates);
        this.latestDataDate = maxDate;

        // All meters and predictors are considered current when they share the same month and year as the latest data date.
        if (this.latestDataDate) {
            this.allDatesCurrent = allDates.every(d =>
                d.getFullYear() === this.latestDataDate.getFullYear() &&
                d.getMonth() === this.latestDataDate.getMonth()
            );
        } else {
            this.allDatesCurrent = false;
        }

        //latest data entry date for which all meters and predictors have data entered
        this.latestDataAllEntries = _.min(allDates);
    }

    /**
     * Iterates over all regression groups in an analysis item and collects
     * the unique meter IDs and predictor IDs used by their selected models.
     * Non-regression group types are not yet handled.
     */
    private collectRegressionGroupInputIds(
        groups: Array<AnalysisGroup>,
        meterStatusChecks: Array<MeterStatusCheck>,
    ): { includedMeterIds: Array<string>; includedPredictorIds: Array<string> } {
        const includedMeterIds: Array<string> = [];
        const includedPredictorIds: Array<string> = [];

        for (const group of groups) {
            if (group.analysisType == 'energyIntensity' || group.analysisType == 'modifiedEnergyIntensity') {
                group.predictorVariables.forEach(pv => {
                    if (pv.productionInAnalysis && !includedPredictorIds.includes(pv.id)) {
                        includedPredictorIds.push(pv.id);
                    }
                });
            }

            // Collect predictor IDs from the group's selected regression model.
            const selectedModel: JStatRegressionModel = group.models?.find(m => m.modelId === group.selectedModelId);
            if (selectedModel) {
                for (const pv of selectedModel.predictorVariables) {
                    if (!includedPredictorIds.includes(pv.id)) {
                        includedPredictorIds.push(pv.id);
                    }
                }
            }

            // Collect unique meter IDs for all calanderized meters belonging to this group.
            const groupMeters: Array<MeterStatusCheck> = meterStatusChecks.filter(cm => cm.groupId === group.idbGroupId);
            for (const cm of groupMeters) {
                if (!includedMeterIds.includes(cm.meterId)) {
                    includedMeterIds.push(cm.meterId);
                }
            }
        }

        return { includedMeterIds, includedPredictorIds };
    }

    /** Returns the latest data entry date for a single predictor. */
    private getPredictorDateEntry(
        predictorId: string,
        predictorStatusChecks: Array<PredictorStatusCheck>
    ): PredictorStatusCheck {
        return predictorStatusChecks.find(p => p.predictorId === predictorId);
    }

    /** Returns the latest data entry date for a single meter. */
    private getMeterDateEntry(
        meterId: string,
        meterStatusChecks: Array<MeterStatusCheck>
    ): MeterStatusCheck {
        return meterStatusChecks.find(cm => cm.meterId === meterId);
    }

    private setAnalysisSetupErrors(calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility) {
        let groupErrorsForItem: Array<GroupAnalysisErrors> = this.groupStatusChecks.flatMap(g => g.groupAnalysisErrors);
        this.analysisSetupErrors = getAnalysisSetupErrors(this.analysisItem, calanderizedMeters, facility, groupErrorsForItem);
        this.hasSetupErrors = this.analysisSetupErrors ? this.analysisSetupErrors.hasError : false;
    }

    private setMeterSetupErrors() {
        this.hasMeterSetupErrors = this.includedMeterStatusChecks.some(g => g.status == 'error');
    }

    private setPredictorSetupErrors() {
        this.hasPredictorSetupErrors = this.includedPredictorStatusChecks.some(g => g.status == 'error');
    }

    private setStatus() {
        if (this.hasSetupErrors || this.hasMeterSetupErrors || this.hasPredictorSetupErrors) {
            this.status = 'error';
        }
        // else if (!this.allDatesCurrent) {
        //     this.status = 'warning';
        // } 
        else {
            this.status = 'good';
        }
    }

    getGroupStatusChecksByGroupId(groupId: string): AnalysisGroupStatusCheck | undefined {
        return this.groupStatusChecks.find(gsc => gsc.group.idbGroupId === groupId);
    }
}