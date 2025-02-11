import { Component } from '@angular/core';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';

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
    ],
    standalone: false
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
  pauseDeleteSub: Subscription;
  allDeleteAccounts: Array<IdbAccount>;
  constructor(private deleteDataService: DeleteDataService,
    private accountDbService: AccountdbService
  ) {
  }


  ngOnInit() {
    this.deleteDataService.pauseDelete.subscribe(pauseDelete => {
      this.pauseDelete = pauseDelete;
    });
    this.accountDbService.allAccounts.subscribe(accounts => {
      this.allDeleteAccounts = accounts.filter(account => {
        return account.deleteAccount;
      });
      this.deleteDataService.setAccountToDelete(this.allDeleteAccounts);
    });

    this.deleteDataService.isDeleting.subscribe(isDeleting => {
      if (isDeleting) {
        this.createToast();
      } else {
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
      this.deleteDataService.pauseDelete.next(true);
    } else {
      this.deleteDataService.pauseDelete.next(false);
      this.deleteDataService.gatherAndDelete();
    }
  }

  async cancelDelete() {
    await this.deleteDataService.cancelDelete();
  }

  mouseDown($event) {
    console.log($event)
  }

  finishDrag() {
    console.log('done..')
  }
}
