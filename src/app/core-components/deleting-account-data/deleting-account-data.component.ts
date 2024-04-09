import { Component } from '@angular/core';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-deleting-account-data',
  templateUrl: './deleting-account-data.component.html',
  styleUrl: './deleting-account-data.component.css',
  animations: [
    trigger('toast', [
      state('show', style({ bottom: '0px' })),
      state('hide', style({ bottom: '-200px' })),
      transition('hide => show', animate('.5s ease')),
      transition('show => hide', animate('.5s ease'))
    ])
  ]
})
export class DeletingAccountDataComponent {

  deletingMessaging: {
    index: number,
    totalCount: number,
    message: string,
    percent: number
  };
  showToast: 'show' | 'hide' = 'hide';
  destroyToast: boolean = true;
  pauseDelete: boolean;
  allDeleteAccounts: Array<IdbAccount>;
  constructor(private deleteDataService: DeleteDataService,
    private accountDbService: AccountdbService
  ) {
  }


  ngOnInit() {
    this.pauseDelete = this.deleteDataService.pauseDelete;
    this.accountDbService.allAccounts.subscribe(accounts => {
      this.allDeleteAccounts = accounts.filter(account => {
        return account.deleteAccount;
      });
      this.deleteDataService.setAccountToDelete(this.allDeleteAccounts);
    });

    this.deleteDataService.isDeleting.subscribe(isDeleting => {
      if (isDeleting) {
        console.log('CREATE TOAST');
        this.createToast();
      } else {
        console.log('CLOSE TOAST');
        this.closeToast();
        this.deleteDataService.setAccountToDelete(this.allDeleteAccounts);
      }
    });

    this.deleteDataService.deletingMessaging.subscribe(message => {
      this.deletingMessaging = message;
    });
  }

  createToast() {
    this.destroyToast = false;
    setTimeout(() => {
      this.showToast = 'show';
    }, 100);
  }

  closeToast() {
    this.showToast = 'hide';
    setTimeout(() => {
      this.destroyToast = true;
    }, 100);
  }

  togglePauseDelete() {
    if (this.pauseDelete == false) {
      this.deleteDataService.pauseDelete = true;
      this.pauseDelete = true;
    } else {
      this.deleteDataService.pauseDelete = false;
      this.pauseDelete = false;
      this.deleteDataService.gatherAndDelete();
    }
  }
}
