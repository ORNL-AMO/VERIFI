import { AssessmentReportVersion, IdbAccount } from '@data/models/idbModels/account';
import { MeterPhase, MeterSource } from '@data/models/constantsAndTypes';
import { GlobalWarmingPotential } from '@data/models/globalWarmingPotentials';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getChargeTypes } from '@data/models/meter-charges-options';
import { ScopeOption } from '@data/models/scopeOption';
import { AgreementType } from '@data/models/agreementType';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { Month } from '@shared/form-data/months';
import { UnitOption } from '@shared/unitOptions';
import {
  VehicleCategory,
  VehicleCollectionType
} from '@shared/vehicle-data/vehicleCategory';
import { VehicleType } from '@shared/vehicle-data/vehicleType';

export type MeterSettingsRuleChange =
  | 'source'
  | 'scope'
  | 'phase'
  | 'fuel'
  | 'collectionUnit'
  | 'energyUnit'
  | 'agreementType'
  | 'includeInEnergy'
  | 'vehicleCategory'
  | 'vehicleType'
  | 'vehicleCollectionUnit'
  | 'vehicleFuel'
  | 'chargeType';

export interface MeterSettingsRuleContext {
  readonly facility: IdbFacility;
  readonly account: IdbAccount;
  readonly customFuels: readonly IdbCustomFuel[];
  readonly customGWPs: readonly IdbCustomGWP[];
  readonly meterDataExists: boolean;
}

export interface MeterSettingsViewModel {
  readonly sourceOptions: readonly MeterSource[];
  readonly scopeOptions: readonly ScopeOption[];
  readonly phaseOptions: readonly MeterPhase[];
  readonly startingUnitOptions: readonly UnitOption[];
  readonly energyUnitOptions: readonly UnitOption[];
  readonly demandUnitOptions: readonly UnitOption[];
  readonly waterIntakeTypes: readonly string[];
  readonly waterDischargeTypes: readonly string[];
  readonly agreementTypes: readonly AgreementType[];
  readonly vehicleCategories: readonly VehicleCategory[];
  readonly vehicleTypes: readonly VehicleType[];
  readonly vehicleCollectionTypes: readonly VehicleCollectionType[];
  readonly vehicleCollectionUnitOptions: readonly UnitOption[];
  readonly fuelTypeOptions: readonly FuelTypeOption[];
  readonly vehicleFuelOptions: readonly FuelTypeOption[];
  readonly selectedFuelTypeOption?: FuelTypeOption;
  readonly selectedVehicleFuelOption?: FuelTypeOption;
  readonly globalWarmingPotentials: readonly GlobalWarmingPotential[];
  readonly chargeTypes: ReturnType<typeof getChargeTypes>;
  readonly months: readonly Month[];
  readonly noLongerInUseYearOptions: readonly number[];
  readonly assessmentReportOption: AssessmentReportVersion;
  readonly displayScope: boolean;
  readonly displayFuel: boolean;
  readonly displayPhase: boolean;
  readonly displayHeatCapacity: boolean;
  readonly displaySiteToSource: boolean;
  readonly displayWaterIntakeTypes: boolean;
  readonly displayWaterDischargeTypes: boolean;
  readonly displayIncludeEnergy: boolean;
  readonly displayRetainRecs: boolean;
  readonly displayVehicle: boolean;
  readonly displayDemandUnit: boolean;
  readonly displayEnergyUnit: boolean;
  readonly displayGlobalWarmingPotential: boolean;
  readonly energySourceLabel: string;
  readonly isEnergyMeter: boolean;
  readonly collectionUnitIsEnergy: boolean;
  readonly hasDifferentCollectionUnits: boolean;
  readonly hasDifferentEnergyUnits: boolean;
  readonly hasDifferentEmissions: boolean;
  readonly globalWarmingPotentialValue: number;
}
