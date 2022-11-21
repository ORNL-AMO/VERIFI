import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {

  modalOpen: BehaviorSubject<boolean>;
  sidebarOpen: BehaviorSubject<boolean>;
  itemsPerPage: BehaviorSubject<number>;
  constructor(private localStorageService: LocalStorageService) {
    this.modalOpen = new BehaviorSubject<boolean>(false);
    this.sidebarOpen = new BehaviorSubject<boolean>(undefined);
    let initialItemsPerPage: number = this.getInitialItemsPerPage();
    console.log('GET');
    if (initialItemsPerPage) {
      this.itemsPerPage = new BehaviorSubject<number>(initialItemsPerPage);
    } else {
      this.itemsPerPage = new BehaviorSubject<number>(12)
    }

    this.itemsPerPage.subscribe(itemsPerPage => {
      if (itemsPerPage) {
        this.localStorageService.store("itemsPerPage", itemsPerPage);
      }
    });
  }

  getInitialItemsPerPage(): number {
    let itemsPerPage: number = this.localStorageService.retrieve("itemsPerPage");
    return itemsPerPage;
  }
}
