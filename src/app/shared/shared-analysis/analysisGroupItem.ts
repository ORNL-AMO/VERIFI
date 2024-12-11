import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from "src/app/models/analysis";


export function getGroupItem(group: AnalysisGroup): AnalysisGroupItem {
    let predictorVariables: Array<AnalysisGroupPredictorVariable> = [];
    let adjust_R2: number = 0;
    let regressionEquation: string = '';
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
        if (group.selectedModelId) {
            selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
            adjust_R2 = selectedModel.adjust_R2;
            predictorVariables = selectedModel.predictorVariables;
            regressionEquation = getRegressionsEquationFromModel(selectedModel);
        } else {
            predictorVariables = group.predictorVariables.filter(variable => {
                return (variable.productionInAnalysis == true);
            });
            regressionEquation = getRegressionEquationNoModel(group, predictorVariables);
        }
    } else if (group.analysisType != 'absoluteEnergyConsumption') {
        predictorVariables = group.predictorVariables.filter(variable => {
            return (variable.productionInAnalysis == true);
        });
    }
    return {
        group: group,
        predictorVariables: predictorVariables,
        adjust_R2: adjust_R2,
        regressionEquation: regressionEquation,
        selectedModel: selectedModel
    }
}

export function getRegressionsEquationFromModel(model: JStatRegressionModel): string {
    //     <span *ngFor="let coefVal of model.coef; let index = index;">
    //     <span *ngIf="index == 0">{{coefVal| customNumber}}</span>
    //     <span *ngIf="index != 0">({{coefVal|
    //         customNumber}}*{{model.predictorVariables[index-1].name}})</span> <span
    //         *ngIf="index != model.coef.length-1"> +</span>
    // </span>
    let regressionEquation: string = '';
    for (let i = 0; i < model.coef.length; i++) {
        regressionEquation = regressionEquation + model.coef[i].toLocaleString(undefined, { maximumSignificantDigits: 5 });
        if (i != 0) {
            regressionEquation = regressionEquation + '*' + model.predictorVariables[i - 1].name;
        }
        if (i != model.coef.length - 1) {
            regressionEquation = regressionEquation + ' + ';
        }
    }
    return regressionEquation;
}

export function getRegressionEquationNoModel(group: AnalysisGroup, predictorVariables: Array<AnalysisGroupPredictorVariable>): string {
    let regressionEquation: string = group.regressionConstant + ' + ';
    for (let i = 0; i < predictorVariables.length; i++) {
        regressionEquation = regressionEquation + predictorVariables[i].regressionCoefficient + '*' + predictorVariables[i].name;
        if (i != predictorVariables.length - 1) {
            regressionEquation = regressionEquation + ' + ';
        }
    }
    return regressionEquation;
}

export interface AnalysisGroupItem {
    group: AnalysisGroup,
    predictorVariables: Array<AnalysisGroupPredictorVariable>,
    adjust_R2: number,
    regressionEquation: string,
    selectedModel: JStatRegressionModel
}