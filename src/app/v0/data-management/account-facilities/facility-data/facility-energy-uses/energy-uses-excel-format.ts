export const ENERGY_USES_SHEET = 'Energy Uses';
export const ENERGY_USES_HEADERS = [
  'Facility', 'Energy Use Group', 'Equipment Name', 'Industrial System', 'Utility Meter Group', 'Notes',
  'Operating hours (hrs/yr)', 'Load factor (%)', 'Duty Factor (%)', 'Efficiency (%)',
  'Utility Type 1', 'Rated Power/Rated Capacity 1', 'Rated Power 1 Unit', 'Number of Equipment 1', 'Energy Use 1', 'Energy Use 1 Unit',
  'Utility Type 2', 'Rated Power/Rated Capacity 2', 'Rated Power 2 Unit', 'Number of Equipment 2', 'Energy Use 2', 'Energy Use 2 Unit'
];

export const CAPACITY_UNITS = ['kW', 'W', 'MW', 'hp', 'kJh', 'GJh', 'MJh', 'MMBtuhr', 'btuhr'];
export const ENERGY_UNITS = ['kWh', 'MWh', 'kJ', 'GJ', 'MJ', 'Therms', 'DTherms', 'MMBtu', 'kcal', 'hph', 'Wh', 'Btu'];
export const INDUSTRIAL_SYSTEMS = ['Pump', 'Fan', 'Process Heating', 'Compressed Air', 'Steam', 'Process Cooling', 'Motor', 'Lighting', 'HVAC', 'Mobile', 'Other'] as const;

export function capacityUnitToExcel(unit: string): string {
  return unit === 'MMBtuhr' ? 'MMBtu/hr' : unit === 'btuhr' ? 'Btu/hr' : unit;
}

export function capacityUnitFromExcel(unit: string): string {
  return unit === 'MMBtu/hr' ? 'MMBtuhr' : unit === 'Btu/hr' ? 'btuhr' : unit;
}

export function escapeMeterGroupName(name: string): string {
  return name.replaceAll('\\', '\\\\').replaceAll(';', '\\;');
}

export function parseMeterGroupNames(value: string): string[] {
  const names: string[] = [];
  let current = '';
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      current += character === ';' || character === '\\' ? character : '\\' + character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ';') {
      if (!current.trim()) { 
        throw new Error('Meter group names cannot be empty.'); 
      }
      names.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (escaped) { current += '\\'; }
  if (current.trim()) { 
    names.push(current.trim()); 
  }
  return names;
}
