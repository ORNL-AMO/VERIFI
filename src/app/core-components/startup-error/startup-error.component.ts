import { Component, Input } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from '../loading/loading.service';

@Component({
  selector: 'app-startup-error',
  templateUrl: './startup-error.component.html',
  styleUrls: ['./startup-error.component.css']
})
export class StartupErrorComponent {
  @Input()
  startupError: string;

  constructor(private accountdbService: AccountdbService, private loadingService: LoadingService){

  }

  resetDatabase(){
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountdbService.deleteDatabase();
  }
}
