import { Injectable } from '@angular/core';
import { AccountdbService } from '../indexedDB/account-db.service';
import { ElectronService } from '../electron/electron.service';

@Injectable({ providedIn: 'root' })
export class DatabaseResetService {
  constructor(private accounts: AccountdbService, private electron: ElectronService) { }

  async resetAndRestart(): Promise<boolean> {
    const success = await this.accounts.deleteDatabase();
    if (!success) return false;
    if (this.electron.isElectron) this.electron.sendAppRelaunch();
    else location.reload();
    return true;
  }
}
