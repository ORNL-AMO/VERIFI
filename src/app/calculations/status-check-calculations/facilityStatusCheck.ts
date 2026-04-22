import { AnalysisGroup, JStatRegressionModel } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";

export interface PredictorDateEntry {
    predictorName: string;
    predictorId: string;
    lastDateEntry: Date;
}

export interface MeterDateEntry {
    meterName: string;
    meterId: string;
    lastDateEntry: Date;
}

export interface AnalysisDataDateCheck {
    hasAnalysis: boolean;
    /** The most recent data date across all meters and predictors used in the analysis. */
    latestDataDate: Date;
    /** The most recent same day/month across all meters and predictors used in the analysis */
    latestDataAllEntries: Date;
    /** True when every meter and predictor has data up to the same month/year as latestDataDate. */
    allDatesCurrent: boolean;
    latestPredictorData: Array<PredictorDateEntry>;
    latestMeterData: Array<MeterDateEntry>;
}

export class FacilityStatusCheck {

    energyAnalysisDataDateCheck: AnalysisDataDateCheck;
    waterAnalysisDataDateCheck: AnalysisDataDateCheck;
    status: 'good' | 'warning' | 'error';
    constructor(
        facility: IdbFacility,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        energyAnalysisItem: IdbAnalysisItem,
        waterAnalysisItem: IdbAnalysisItem
    ) {
        if (energyAnalysisItem) {
            this.energyAnalysisDataDateCheck = this.getAnalysisDataDateCheck(calanderizedMeters, energyAnalysisItem, predictors, predictorData);
        } else {
            this.energyAnalysisDataDateCheck = {
                hasAnalysis: false,
                latestDataDate: undefined,
                allDatesCurrent: false,
                latestPredictorData: [],
                latestMeterData: [],
                latestDataAllEntries: undefined
            }
        }
        if (waterAnalysisItem) {
            this.waterAnalysisDataDateCheck = this.getAnalysisDataDateCheck(calanderizedMeters, waterAnalysisItem, predictors, predictorData);
        } else {
            this.waterAnalysisDataDateCheck = {
                hasAnalysis: false,
                latestDataDate: undefined,
                allDatesCurrent: false,
                latestPredictorData: [],
                latestMeterData: [],
                latestDataAllEntries: undefined
            }
        }
        this.status = this.determineStatus(this.energyAnalysisDataDateCheck, this.waterAnalysisDataDateCheck);
    }

    /**
     * Builds an AnalysisDataDateCheck for a single analysis item by examining
     * every regression group's meters and predictors and finding the latest
     * data entry date for each.
     */
    private getAnalysisDataDateCheck(
        calanderizedMeters: Array<CalanderizedMeter>,
        analysisItem: IdbAnalysisItem,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>
    ): AnalysisDataDateCheck {
        const { includedMeterIds, includedPredictorIds } = this.collectRegressionGroupInputIds(analysisItem.groups, calanderizedMeters);

        const latestPredictorData: Array<PredictorDateEntry> = includedPredictorIds.map(predictorId =>
            this.getPredictorDateEntry(predictorId, predictors, predictorData)
        );

        const latestMeterData: Array<MeterDateEntry> = includedMeterIds.map(meterId =>
            this.getMeterDateEntry(meterId, calanderizedMeters)
        );

        const allDates: Array<Date> = [
            ...latestPredictorData.map(d => d.lastDateEntry),
            ...latestMeterData.map(d => d.lastDateEntry)
        ];

        const latestDataDate: Date = new Date(Math.max(...allDates.map(d => d.getTime())));

        // All meters and predictors are considered current when they share the same month and year as the latest data date.
        const allDatesCurrent: boolean = allDates.every(d =>
            d.getFullYear() === latestDataDate.getFullYear() &&
            d.getMonth() === latestDataDate.getMonth()
        );

        const latestDataAllEntries: Date = new Date(Math.min(...allDates.map(d => d.getTime())));

        return { hasAnalysis: true, latestDataDate, allDatesCurrent, latestPredictorData, latestMeterData, latestDataAllEntries };
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

    private determineStatus(
        energyCheck: AnalysisDataDateCheck,
        waterCheck: AnalysisDataDateCheck
    ): 'good' | 'warning' | 'error' {
        // If either analysis has no data, status is error.
        if (!energyCheck.hasAnalysis && !waterCheck.hasAnalysis) {
            return 'error';
        }
        // If either analysis has data that is not current, status is warning.
        if ((energyCheck.hasAnalysis && !energyCheck.allDatesCurrent) || (waterCheck.hasAnalysis && !waterCheck.allDatesCurrent)) {
            return 'warning';
        }
        // Otherwise, status is good.
        return 'good';
    }
}