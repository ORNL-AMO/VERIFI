import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type ModalAction = 'save' | 'discard';

@Injectable({
  providedIn: 'root',
})
export class RouterGuardService {

  actionSelected: Subject<ModalAction>;
  showModal: BehaviorSubject<boolean>;
  
  constructor() { 
    this.actionSelected = new Subject<ModalAction>();
    this.showModal = new BehaviorSubject<boolean>(false);
  }

  getModalAction() {
    return this.actionSelected.asObservable();
  }

  setModalAction(action: ModalAction) {
    this.actionSelected.next(action);
    this.setShowModal(false);
  }

  setShowModal(show: boolean) {
    if (show) {
      this.actionSelected.next(undefined);
    }
    this.showModal.next(show);
  }

  getShowModal() {
    return this.showModal.asObservable();
  }
}