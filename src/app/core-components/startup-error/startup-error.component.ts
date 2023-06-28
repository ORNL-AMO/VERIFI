import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from '../loading/loading.service';
import { IdbAccount } from 'src/app/models/idb';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-startup-error',
  templateUrl: './startup-error.component.html',
  styleUrls: ['./startup-error.component.css']
})
export class StartupErrorComponent {
  @Input()
  startupError: string;
  @Output('emitReset')
  emitReset: EventEmitter<boolean> = new EventEmitter();

  accounts: Array<IdbAccount>;
  constructor(private accountdbService: AccountdbService, private loadingService: LoadingService,
    private dbChangesService: DbChangesService, private router: Router) {

  }

  ngOnInit() {
    this.accounts = this.accountdbService.allAccounts.getValue();
  }

  resetDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountdbService.deleteDatabase();
  }
}
