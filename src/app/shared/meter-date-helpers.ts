import { IdbPredictorData } from '@data/models/idbModels/predictorData';

export function checkSameMonth(date1: Date, date2: Date): boolean {
  return date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth();
}

export function checkSameMonthPredictorData(predictorData: IdbPredictorData, date: Date): boolean {
  return predictorData.year == date.getFullYear() && predictorData.month == (date.getMonth() + 1);
}
