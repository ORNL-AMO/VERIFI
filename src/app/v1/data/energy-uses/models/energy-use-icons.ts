import type { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

const EQUIPMENT_ICONS = {
  Pump: 'pump', Fan: 'fan', 'Process Heating': 'processHeating', 'Process Cooling': 'processCooling',
  Steam: 'steam', 'Compressed Air': 'compressedAir', Motor: 'motor', HVAC: 'hvac', Lighting: 'lighting', Mobile: 'mobile', Other: 'otherEquipment'
} as const satisfies Record<EquipmentType, IconName>;

/** Saved/imported categories may predate the current catalog. Never persist presentation choices. */
export function energyUseIcon(category: string | null | undefined): IconName {
  return category && Object.hasOwn(EQUIPMENT_ICONS, category) ? EQUIPMENT_ICONS[category as EquipmentType] : 'otherEquipment';
}
