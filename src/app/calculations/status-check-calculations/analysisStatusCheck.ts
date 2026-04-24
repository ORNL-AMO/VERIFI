import { CalanderizedMeter } from "src/app/models/calanderization";
import { MeterDateEntry, PredictorDateEntry } from "./statusCheckModels";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { AnalysisGroup, JStatRegressionModel } from "src/app/models/analysis";
import { AnalysisSetupErrors } from "src/app/models/validation";


export class AnalysisStatusCheck {

    hasAnalysis: boolean;
    /** The most recent data date across all meters and predictors used in the analysis. */
    latestDataDate: Date;
    /** The most recent same day/month across all meters and predictors used in the analysis */
    latestDataAllEntries: Date;
    /** True when every meter and predictor has data up to the same month/year as latestDataDate. */
    allDatesCurrent: boolean;
    latestPredictorData: Array<PredictorDateEntry>;
    latestMeterData: Array<MeterDateEntry>;

    hasSetupErrors: boolean;

    status: 'good' | 'warning' | 'error';
    constructor(analysisItem: IdbAnalysisItem,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        analysisSetupErrors: Array<AnalysisSetupErrors>) {
        if (analysisItem) {
            this.hasAnalysis = true;
            this.setAnalysisDataDateCheck(calanderizedMeters, analysisItem, predictors, predictorData);
            this.setHasSetupErrors(analysisSetupErrors, analysisItem.guid);
            this.setStatus();
        } else {
            this.hasAnalysis = false;
            this.latestDataDate = undefined;
            this.allDatesCurrent = false;
            this.latestPredictorData = [];
            this.latestMeterData = [];
            this.latestDataAllEntries = undefined;
            this.hasSetupErrors = false;
            this.status = 'good';
        }
    }

    /**
    * Builds an AnalysisDataDateCheck for a single analysis item by examining
    * every regression group's meters and predictors and finding the latest
    * data entry date for each.
    */
    private setAnalysisDataDateCheck(
        calanderizedMeters: Array<CalanderizedMeter>,
        analysisItem: IdbAnalysisItem,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>
    ) {
        const { includedMeterIds, includedPredictorIds } = this.collectRegressionGroupInputIds(analysisItem.groups, calanderizedMeters);

        this.latestPredictorData = includedPredictorIds.map(predictorId =>
            this.getPredictorDateEntry(predictorId, predictors, predictorData)
        );

        this.latestMeterData = includedMeterIds.map(meterId =>
            this.getMeterDateEntry(meterId, calanderizedMeters)
        );

        const allDates: Array<Date> = [
            ...this.latestPredictorData.map(d => d.lastDateEntry),
            ...this.latestMeterData.map(d => d.lastDateEntry)
        ];

        this.latestDataDate = new Date(Math.max(...allDates.map(d => d.getTime())));

        // All meters and predictors are considered current when they share the same month and year as the latest data date.
        this.allDatesCurrent = allDates.every(d =>
            d.getFullYear() === this.latestDataDate.getFullYear() &&
            d.getMonth() === this.latestDataDate.getMonth()
        );

        this.latestDataAllEntries = new Date(Math.min(...allDates.map(d => d.getTime())));
    }

    /**
     * Iterates over all regression groups in an analysis item and collects
     * the unique meter IDs and predictor IDs used by their selected models.
     * Non-regression group types are not yet handled.
     */
    private collectRegressionGroupInputIds(
        groups: Array<AnalysisGroup>,
        calanderizedMeters: Array<CalanderizedMeter>
    ): { includedMeterIds: Array<string>; includedPredictorIds: Array<string> } {
        const includedMeterIds: Array<string> = [];
        const includedPredictorIds: Array<string> = [];

        for (const group of groups) {
            if (group.analysisType !== 'regression') {
                // TODO: handle other analysis types
                continue;
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
            const groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.groupId === group.idbGroupId);
            for (const cm of groupMeters) {
                if (!includedMeterIds.includes(cm.meter.guid)) {
                    includedMeterIds.push(cm.meter.guid);
                }
            }
        }

        return { includedMeterIds, includedPredictorIds };
    }

    /** Returns the latest data entry date for a single predictor. */
    private getPredictorDateEntry(
        predictorId: string,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>
    ): PredictorDateEntry {
        const predictor: IdbPredictor | undefined = predictors.find(p => p.guid === predictorId);
        const dataForPredictor: Array<IdbPredictorData> = predictorData.filter(pd => pd.predictorId === predictorId);
        const lastDateEntry: Date = new Date(Math.max(...dataForPredictor.map(pd => new Date(pd.year, pd.month, 1).getTime())));
        return {
            predictorName: predictor?.name ?? 'Unknown Predictor',
            predictorId,
            lastDateEntry
        };
    }

    /** Returns the latest data entry date for a single meter. */
    private getMeterDateEntry(
        meterId: string,
        calanderizedMeters: Array<CalanderizedMeter>
    ): MeterDateEntry {
        const calanderizedMeter: CalanderizedMeter | undefined = calanderizedMeters.find(cm => cm.meter.guid === meterId);
        const monthlyData = calanderizedMeter?.monthlyData ?? [];
        const lastDateEntry: Date = new Date(Math.max(...monthlyData.map(md => new Date(md.year, md.monthNumValue, 1).getTime())));
        return {
            meterName: calanderizedMeter?.meter.name ?? 'Unknown Meter',
            meterId,
            lastDateEntry
        };
    }

    private setHasSetupErrors(analysisSetupErrors: Array<AnalysisSetupErrors>, analysisItemId: string) {
        const setupErrorsForAnalysis = analysisSetupErrors.find(e => e.analysisId === analysisItemId);
        this.hasSetupErrors = setupErrorsForAnalysis ? setupErrorsForAnalysis.hasError : false;
    }

    private setStatus() {
        if (this.hasSetupErrors || !this.hasAnalysis) {
            this.status = 'error';
        } else if (!this.allDatesCurrent) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }
}