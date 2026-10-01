export class InvalidDataVersionError extends Error {
  constructor(readonly dataVersion: unknown) {
    super('The VERIFI data version must be a non-negative integer.');
    this.name = 'InvalidDataVersionError';
  }
}

export class FutureDataVersionError extends Error {
  constructor(readonly dataVersion: number, readonly currentVersion: number) {
    super(`Data version ${dataVersion} requires a newer version of VERIFI.`);
    this.name = 'FutureDataVersionError';
  }
}

export function validateDataVersion(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new InvalidDataVersionError(value);
  }
  return value as number;
}
