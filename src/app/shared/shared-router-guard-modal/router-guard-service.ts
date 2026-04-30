import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type ModalAction = 'save' | 'discard' | 'cancel';

@Injectable({
  providedIn: 'root',
})
export class RouterGuardService {

  actionSelected: Subject<ModalAction>;
  showModal: BehaviorSubject<boolean>;
  showSave: BehaviorSubject<boolean>;
  constructor() { 
    this.actionSelected = new Subject<ModalAction>();
    this.showModal = new BehaviorSubject<boolean>(false);
    this.showSave = new BehaviorSubject<boolean>(true);
  }

  getModalAction() {
    return this.actionSelected.asObservable();
  }

  setModalAction(action: ModalAction) {
    this.actionSelected.next(action);
    this.setShowModal(false);
  }

  setShowModal(show: boolean) {
    this.showModal.next(show);
  }

  setShowSave(show: boolean) {
    this.showSave.next(show);
  }

  getShowModal() {
    return this.showModal.asObservable();
  }
}