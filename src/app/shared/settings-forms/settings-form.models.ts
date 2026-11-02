import { FormControl, FormGroup } from '@angular/forms';
import { IdbAccount } from '@data/models/idbModels/account';
import { AccountAndFacility } from '@data/models/idbModels/accountAndFacility';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SustainabilityQuestions } from '@data/models/sustainabilityQuestions';

type Controls<T> = { [Key in keyof T]-?: FormControl<T[Key] | null> };
type ProfileValues = Pick<AccountAndFacility,
  'name' | 'country' | 'city' | 'state' | 'zip' | 'address' | 'naics1' | 'naics2' | 'naics3'
  | 'notes' | 'color' | 'contactName' | 'contactEmail' | 'contactPhone'>;

export type AccountProfileForm = FormGroup<Controls<ProfileValues>>;
export type FacilityProfileForm = FormGroup<
  Controls<ProfileValues & Pick<IdbFacility, 'size' | 'classification'>>
>;
export type UnitsForm = FormGroup<Controls<Pick<AccountAndFacility,
  'unitsOfMeasure' | 'energyUnit' | 'massUnit' | 'volumeLiquidUnit' | 'volumeGasUnit'
  | 'energyIsSource' | 'eGridSubregion' | 'electricityUnit'>>>;
export type FinancialForm = FormGroup<Controls<Pick<AccountAndFacility,
  'fiscalYear' | 'fiscalYearMonth' | 'fiscalYearCalendarEnd'>>>;
export type SustainabilityQuestionControls = Controls<SustainabilityQuestions>;
export type AccountGoalsForm = FormGroup<SustainabilityQuestionControls & Controls<Pick<IdbAccount,
  'displayEmissions' | 'assessmentReportVersion' | 'isBetterPlantsPartner'>>>;
export type FacilityGoalsForm = FormGroup<
  SustainabilityQuestionControls & Controls<Pick<IdbFacility, 'isNewFacility'>>
>;
export type GoalKind = 'energy' | 'water' | 'greenhouse';
export type GoalBaselineControl = `${GoalKind}ReductionBaselineYear`;
export type GoalTargetControl = `${GoalKind}ReductionTargetYear`;
export type BackupSettingsForm = FormGroup<Controls<Pick<IdbAccount,
  'isSharedBackupFile' | 'sharedFileAuthor' | 'archiveOption'>>>;
