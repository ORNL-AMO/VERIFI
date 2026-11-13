import { capacityUnitFromExcel, capacityUnitToExcel } from './energy-uses-excel-format';

describe('Energy Uses capacity-unit workbook compatibility', () => {
  const units = [
    ['kW', 'kW'], ['W', 'W'], ['MW', 'MW'], ['hp', 'hp'],
    ['kJh', 'kJ/hr'], ['GJh', 'GJ/hr'], ['MJh', 'MJ/hr'],
    ['MMBtuhr', 'MMBtu/hr'], ['btuhr', 'Btu/hr']
  ];

  it.each(units)('accepts the legacy code %s without changing its stored unit', code => {
    expect(capacityUnitFromExcel(code)).toBe(code);
  });

  it.each(units)('exports %s as %s and accepts that display label on reimport', (code, label) => {
    expect(capacityUnitToExcel(code)).toBe(label);
    expect(capacityUnitFromExcel(label)).toBe(code);
  });

  it.each(['', 'kJ/h', 'unknown', 'constructor', '__proto__'])('rejects unsupported unit %s', unit => {
    expect(capacityUnitFromExcel(unit)).toBeUndefined();
  });
});
