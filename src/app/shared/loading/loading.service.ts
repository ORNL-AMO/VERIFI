import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
  public loading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public loadingMessage: BehaviorSubject<string> = new BehaviorSubject<string>("Loading...");
    
  constructor() {}

  getLoadingStatus(): Observable<boolean> {
    return this.loading;
  }

  setLoadingStatus(value) {
    this.loading.next(value);
  }

  getLoadingMessage(): Observable<string> {
    return this.loadingMessage;
  }

  setLoadingMessage(value) {
    this.loadingMessage.next(value);
  }
}