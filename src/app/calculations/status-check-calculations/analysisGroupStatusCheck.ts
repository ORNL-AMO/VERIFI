import { AnalysisGroup, JStatRegressionModel } from "src/app/models/analysis";
import { MeterStatusCheck } from "./meterStatusCheck";
import { PredictorStatusCheck } from "./predictorStatusCheck";
import { GroupAnalysisErrors } from "src/app/models/validation";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
import { getGroupErrors } from "./validation/groupAnalysisValidation";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";


export class AnalysisGroupStatusCheck {

    group: AnalysisGroup;
    groupAnalysisErrors: GroupAnalysisErrors;
    hasModelErrors: boolean;
    hasPredictorSetupErrors: boolean;
    hasMeterSetupErrors: boolean;
    status: STATUS_CHECK_OPTIONS;
    constructor(group: AnalysisGroup, predictorStatusChecks: Array<PredictorStatusCheck>, meterStatusChecks: Array<MeterStatusCheck>, analysisItem: IdbAnalysisItem, calanderizedMeters: Array<CalanderizedMeter>, predictorData: Array<IdbPredictorData>) {
        this.group = group;
        this.setAnalysisGroupErrors(analysisItem, calanderizedMeters, predictorData);
        if (group.analysisType == 'skip' || group.analysisType == 'skipAnalysis') {
            this.hasModelErrors = false;
            this.hasPredictorSetupErrors = false;
            this.hasMeterSetupErrors = false;
        } else {
            this.setHasPredictorErrors(group, predictorStatusChecks);
            this.setHasMeterErrors(group, meterStatusChecks);
        }
        this.setStatus();
    }

    private setAnalysisGroupErrors(analysisItem: IdbAnalysisItem, calanderizedMeters: Array<CalanderizedMeter>, predictorData: Array<IdbPredictorData>) {
        this.groupAnalysisErrors = getGroupErrors(this.group, analysisItem, calanderizedMeters, predictorData);
    }

    private setHasPredictorErrors(group: AnalysisGroup, predictorStatusChecks: Array<PredictorStatusCheck>) {
        const groupPredictorIds: Array<string> = [];
        if (group.analysisType == 'energyIntensity' || group.analysisType == 'modifiedEnergyIntensity') {
            group.predictorVariables.forEach(pv => {
                if (pv.productionInAnalysis && !groupPredictorIds.includes(pv.id)) {
                    groupPredictorIds.push(pv.id);
                }
            });
        }

        // Collect predictor IDs from the group's selected regression model.
        if (group.analysisType == 'regression') {
            if (group.isGeneratedModel) {
                const selectedModel: JStatRegressionModel = group.models?.find(m => m.modelId === group.selectedModelId);
                if (selectedModel) {
                    for (const pv of selectedModel.predictorVariables) {
                        if (!groupPredictorIds.includes(pv.id)) {
                            groupPredictorIds.push(pv.id);
                        }
                    }
                }
            } else {
                //user defined model
                group.predictorVariables.forEach(pv => {
                    if (pv.productionInAnalysis && !groupPredictorIds.includes(pv.id)) {
                        groupPredictorIds.push(pv.id);
                    }
                });
            }
        }
        const groupPredictorStatusChecks: Array<PredictorStatusCheck> = predictorStatusChecks.filter(p => groupPredictorIds.includes(p.predictorId));
        this.hasPredictorSetupErrors = groupPredictorStatusChecks.some(p => p.status === 'error');
    }

    private setHasMeterErrors(group: AnalysisGroup, meterStatusChecks: Array<MeterStatusCheck>) {
        const groupMeterStatusChecks = meterStatusChecks.filter(m => m.groupId === group.idbGroupId);
        this.hasMeterSetupErrors = groupMeterStatusChecks.some(m => m.status === 'error');
    }

    private setStatus() {
        if (this.hasPredictorSetupErrors || this.hasMeterSetupErrors || this.groupAnalysisErrors?.hasErrors) {
            this.status = 'error';
        }else if(this.groupAnalysisErrors?.hasInvalidRegressionModel || this.groupAnalysisErrors?.hasInvalidUserDefinedModel) {
            this.status = 'warning';
        }
        else {
            this.status = 'good';
        }
    }

}