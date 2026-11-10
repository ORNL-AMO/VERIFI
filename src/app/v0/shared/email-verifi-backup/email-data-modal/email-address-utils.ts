import { FormControl, Validators } from '@angular/forms';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';

export function collectSavedEmails(
  account: IdbAccount | undefined,
  facilities: readonly IdbFacility[]
): string[] {
  const facilityEmails = [...facilities]
    .sort((first, second) => first.name.localeCompare(second.name))
    .map(facility => facility.contactEmail);
  const candidates = [account?.contactEmail, ...facilityEmails];
  const savedEmails: string[] = [];
  const seen = new Set<string>();

  candidates.forEach(candidate => {
    const email = candidate?.trim();
    const key = email?.toLowerCase();
    if (email && key && isValidEmail(email) && !seen.has(key)) {
      savedEmails.push(email);
      seen.add(key);
    }
  });

  return savedEmails;
}

export function filterSavedEmails(
  savedEmails: readonly string[],
  term: string,
  excludedEmails: readonly string[] = [],
  maximumResults: number = 10
): string[] {
  const searchTerm = term.trim().toLowerCase();
  if (!searchTerm) {
    return [];
  }

  const excluded = new Set(excludedEmails.map(email => email.toLowerCase()));
  return savedEmails
    .filter(email => !excluded.has(email.toLowerCase()))
    .filter(email => email.toLowerCase().includes(searchTerm))
    .slice(0, maximumResults);
}

export function splitEmailEntry(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map(email => email.trim())
    .filter(Boolean);
}

export function isValidEmail(email: string): boolean {
  return Validators.email(new FormControl(email)) === null;
}
