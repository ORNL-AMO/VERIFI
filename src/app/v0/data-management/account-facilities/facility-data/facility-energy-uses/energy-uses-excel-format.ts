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

export const ENERGY_USES_NUMERIC_COLUMNS = [6, 7, 8, 9, 11, 13, 14, 17, 19, 20] as const;
const CAPACITY_LABELS: Readonly<Record<string, string>> = {
  kJh: 'kJ/hr', GJh: 'GJ/hr', MJh: 'MJ/hr', MMBtuhr: 'MMBtu/hr', btuhr: 'Btu/hr'
};

export function capacityUnitToExcel(unit: string): string {
  return Object.hasOwn(CAPACITY_LABELS, unit) ? CAPACITY_LABELS[unit] : unit;
}

export const EXCEL_CAPACITY_UNITS = CAPACITY_UNITS.map(capacityUnitToExcel);

export function capacityUnitFromExcel(unit: string): string | undefined {
  return CAPACITY_UNITS.find(code => capacityUnitToExcel(code) === unit);
}

export function energyUsesMaximumHours(year: number): number {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 8784 : 8760;
}

export function parseEnergyUsesNumber(value: unknown): number | undefined {
  if (value == null || typeof value === 'string' && !value.trim()) { return undefined; }
  const decimalText = typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim());
  if (typeof value !== 'number' && !decimalText) {
    throw new Error('Enter a plain decimal number without separators, units, or percent signs.');
  }
  const number = Number(value);
  if (!Number.isFinite(number)) { throw new Error('Enter a finite number.'); }
  return number;
}

export function energyUsesNumberError(column: number, value: number, year: number): string | undefined {
  if (!Number.isFinite(value)) { return 'Enter a finite number.'; }
  if (column === 6 && (value < 0 || value > energyUsesMaximumHours(year))) {
    return `Enter hours from 0 to ${energyUsesMaximumHours(year)} for ${year}.`;
  }
  if (column === 9 && (value <= 0 || value > 100)) {
    return 'Enter an electricity efficiency greater than 0 and at most 100.';
  }
  if ([13, 19].includes(column) && (!Number.isInteger(value) || value < 1)) {
    return 'Enter a whole equipment count of at least 1.';
  }
  if (value < 0) { return 'Enter a number greater than or equal to 0.'; }
  return undefined;
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
