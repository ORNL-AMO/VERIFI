import { formatUsPhoneNumber } from './phone-number';

describe('formatUsPhoneNumber', () => {
  it.each([
    ['', ''],
    ['123', '123'],
    ['1234', '123-4'],
    ['1234567', '123-456-7'],
    ['(123) 456-7890 ext 5', '123-456-7890']
  ])('formats %j as %j', (input, expected) => {
    expect(formatUsPhoneNumber(input)).toBe(expected);
  });
});
