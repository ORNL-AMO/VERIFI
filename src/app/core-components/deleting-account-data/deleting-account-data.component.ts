import { toObservable } from '@angular/core/rxjs-interop';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { Component, inject } from '@angular/core';
import { AccountDeletionError, DeleteDataService } from 'src/app/indexedDB/delete-data.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
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
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);

  deletingMessaging: {
    index: number,
    totalCount: number,
    message: string,
    percent: number
  };
  showToast: 'show' | 'hide' = 'hide';
  destroyToast: boolean = true;
  deletionError: AccountDeletionError;
  allDeleteAccounts: Array<IdbAccount>;
  constructor(private deleteDataService: DeleteDataService,
    private accountDbService: AccountdbService
  ) {
  }


  ngOnInit() {
    toObservable(this.applicationLifecycleService.accountCatalog).subscribe(accounts => {
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
      }
    });

    this.deleteDataService.deletingMessaging.subscribe(message => {
      this.deletingMessaging = message;
    });

    this.deleteDataService.deletionError.subscribe(error => {
      this.deletionError = error;
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

  async retryDelete() {
    await this.deleteDataService.retryDelete();
  }

  mouseDown($event) {
    console.log($event)
  }

  finishDrag() {
    console.log('done..')
  }
}
