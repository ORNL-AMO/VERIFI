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
  openCreateReportModal: BehaviorSubject<boolean>;
  energyHomeCarouselIndex: BehaviorSubject<number>;
  waterHomeCarouselIndex: BehaviorSubject<number>;
  exportEnergyTreasureHuntModalOpen: BehaviorSubject<boolean>;
  constructor(private localStorageService: LocalStorageService) {
    this.modalOpen = new BehaviorSubject<boolean>(false);
    this.exportEnergyTreasureHuntModalOpen = new BehaviorSubject<boolean>(false);
    this.sidebarOpen = new BehaviorSubject<boolean>(true);
    let initialItemsPerPage: number = this.getInitialItemsPerPage();
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

    this.openCreateReportModal = new BehaviorSubject<boolean>(false);

    let initialEnergyHomeCarouselIndex: number = this.getInitialEnergyHomeCarouselIndex();
    if (initialEnergyHomeCarouselIndex != undefined) {
      this.energyHomeCarouselIndex = new BehaviorSubject<number>(initialEnergyHomeCarouselIndex);
    } else {
      this.energyHomeCarouselIndex = new BehaviorSubject<number>(0)
    }

    this.energyHomeCarouselIndex.subscribe(energyHomeCarouselIndex => {
      if (energyHomeCarouselIndex) {
        this.localStorageService.store("energyHomeCarouselIndex", energyHomeCarouselIndex);
      }
    });


    let initialWaterHomeCarouselIndex: number = this.getInitialWaterHomeCarouselIndex();
    if (initialWaterHomeCarouselIndex != undefined) {
      this.waterHomeCarouselIndex = new BehaviorSubject<number>(initialWaterHomeCarouselIndex);
    } else {
      this.waterHomeCarouselIndex = new BehaviorSubject<number>(0)
    }

    this.waterHomeCarouselIndex.subscribe(waterHomeCarouselIndex => {
      if (waterHomeCarouselIndex) {
        this.localStorageService.store("waterHomeCarouselIndex", waterHomeCarouselIndex);
      }
    });

  }

  getInitialItemsPerPage(): number {
    let itemsPerPage: number = this.localStorageService.retrieve("itemsPerPage");
    return itemsPerPage;
  }

  getInitialEnergyHomeCarouselIndex(): number {
    let energyHomeCarouselIndex: number = this.localStorageService.retrieve("energyHomeCarouselIndex");
    return energyHomeCarouselIndex;
  }

  getInitialWaterHomeCarouselIndex(): number {
    let waterHomeCarouselIndex: number = this.localStorageService.retrieve("waterHomeCarouselIndex");
    return waterHomeCarouselIndex;
  }
}
