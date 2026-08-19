export interface SustainabilityQuestions {
    energyReductionGoal: boolean,
    energyReductionPercent: number,
    energyReductionBaselineYear: number,
    energyReductionTargetYear: number,
    energyIsAbsolute: boolean,
    //greenhouse reductions goals are used
    //by the better climate report that is currently
    //hidden.
    greenhouseReductionGoal: boolean,
    greenhouseReductionPercent: number,
    greenhouseReductionBaselineYear: number,
    greenhouseReductionTargetYear: number,
    greenhouseIsAbsolute: boolean,
    waterReductionGoal: boolean,
    waterReductionPercent: number,
    waterReductionBaselineYear: number,
    waterReductionTargetYear: number,
    waterIsAbsolute: boolean
  }