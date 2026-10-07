import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import {
  annualResultMarkers,
  monthlyResultMarkers,
  orderedUniqueResultMarkers
} from './analysis-result-markers';

describe('analysis result markers', () => {
  it('maps banked, savings, transition, and generated model periods', () => {
    const generated = {
      analysisType: 'regression', isGeneratedModel: true, regressionModelYear: 2022
    } as AnalysisGroup;

    expect(annualResultMarkers({
      year: 2022, isBanked: true, isIntermediateBanked: false, savingsBanked: 10
    } as AnnualAnalysisSummary, generated)).toEqual(['banked-source', 'banked-savings', 'model']);
    expect(annualResultMarkers({
      year: 2023, isBanked: true, isIntermediateBanked: true, savingsBanked: 0
    } as AnnualAnalysisSummary, generated)).toEqual(['transition']);
  });

  it('maps user-defined model months using the configured date range', () => {
    const userDefined = {
      analysisType: 'regression', isGeneratedModel: false,
      regressionStartYear: 2022, regressionModelStartMonth: 3,
      regressionEndYear: 2023, regressionModelEndMonth: 2
    } as AnalysisGroup;

    expect(monthlyResultMarkers({
      date: new Date(2022, 5, 1), fiscalYear: 2022,
      isBanked: true, isIntermediateBanked: true, savingsBanked: 0
    } as MonthlyAnalysisSummaryData, userDefined)).toEqual(['transition', 'model']);
  });

  it('deduplicates markers in the shared legend order', () => {
    expect(orderedUniqueResultMarkers(['model', 'transition', 'banked-source', 'model']))
      .toEqual(['banked-source', 'transition', 'model']);
  });
});
