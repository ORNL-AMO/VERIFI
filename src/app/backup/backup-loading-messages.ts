import { LoadingService } from '../core-components/loading/loading.service';

const ACCOUNT_BACKUP_MESSAGES = [
  'Adding Facilities',
  'Adding Meter Groups',
  'Adding Meters',
  'Adding Meter Data',
  'Adding Predictors',
  'Adding Facility Analysis Items',
  'Adding Account Analysis Items',
  'Adding Custom Fuels',
  'Adding Account Reports'
] as const;

const FACILITY_BACKUP_MESSAGES = [
  'Adding Facility',
  'Adding Meter Groups',
  'Adding Meters',
  'Adding Meter Data',
  'Adding Predictors',
  'Adding Facility Analysis Items',
  'Adding Custom Fuels'
] as const;

export function addAccountBackupMessages(loadingService: LoadingService): void {
  ACCOUNT_BACKUP_MESSAGES.forEach(message => loadingService.addLoadingMessage(message));
}

export function addFacilityBackupMessages(loadingService: LoadingService): void {
  FACILITY_BACKUP_MESSAGES.forEach(message => loadingService.addLoadingMessage(message));
}
