import { energyUseIcon } from './energy-use-icons';
import { ICON_REGISTRY } from '@app/v1/shared/icons/icon-registry';
import AirVentIcon from '@hugeicons/core-free-icons/AirVentIcon';
import LampCeilingIcon from '@hugeicons/core-free-icons/LampCeilingIcon';
import ForkliftIcon from '@hugeicons/core-free-icons/ForkliftIcon';

it.each([
  ['Pump', 'pump'], ['Fan', 'fan'], ['Process Heating', 'processHeating'], ['Process Cooling', 'processCooling'],
  ['Steam', 'steam'], ['Compressed Air', 'compressedAir'], ['Motor', 'motor'], ['HVAC', 'hvac'],
  ['Lighting', 'lighting'], ['Mobile', 'mobile'], ['Other', 'tools'], ['Imported category', 'tools'], [undefined, 'tools'], ['constructor', 'tools']
])('uses the shared category icon for %s', (category, expected) => expect(energyUseIcon(category)).toBe(expected));
it('uses the selected Hugeicons without replacing custom equipment designs', () => {
  expect(ICON_REGISTRY.hvac).toBe(AirVentIcon); expect(ICON_REGISTRY.lighting).toBe(LampCeilingIcon); expect(ICON_REGISTRY.mobile).toBe(ForkliftIcon);
});
