import { AnalysisGroup, JStatRegressionModel } from "../models/analysis";

export function getGroupItem(group: AnalysisGroup, facilityId: string, baselineYear: number): FacilityGroupAnalysisItem {
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
        if (group.selectedModelId) {
            selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
        }
    }
    return {
        group: group,
        selectedModel: selectedModel,
        facilityId: facilityId,
        baselineYear: baselineYear
    }
}

export interface FacilityGroupAnalysisItem {
    group: AnalysisGroup,
    selectedModel: JStatRegressionModel,
    facilityId: string,
    baselineYear: number
}


