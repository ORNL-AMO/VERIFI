import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  public loading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public loadingMessage: BehaviorSubject<string> = new BehaviorSubject<string>("Loading...");
  public loadingList: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public loadingMessages: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  public title: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
  public currentLoadingIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public isLoadingComplete: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public navigationAfterLoading: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
  public context: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);

  constructor() { }

  getLoadingStatus(): Observable<boolean> {
    return this.loading;
  }

  setLoadingStatus(value: boolean) {
    this.loading.next(value);
  }

  getLoadingMessage(): Observable<string> {
    return this.loadingMessage;
  }

  setLoadingMessage(value: string) {
    this.loadingMessage.next(value);
  }

  getLoadingMessages(): Observable<Array<string>> {
    return this.loadingMessages;
  }

  addLoadingMessage(value: string) {
    const current = this.loadingMessages.getValue();
    this.loadingMessages.next([...current, value]);
  }

  clearLoadingMessages() {
    this.loadingMessages.next([]);
  }

  getTitle(): Observable<string> {
    return this.title;
  }

  setTitle(value: string) {
    this.title.next(value);
  }

  setCurrentLoadingIndex(index: number) {
    this.currentLoadingIndex.next(index);
  }

  getCurrentLoadingIndex(): Observable<number> {
    return this.currentLoadingIndex;
  }

  triggerNavigationAfterLoading(context: string) {
    this.navigationAfterLoading.next(context);
  }

  setLoadingComplete(value: boolean) {
    this.isLoadingComplete.next(value);
  }

  getLoadingComplete(): Observable<boolean> {
    return this.isLoadingComplete;
  }

  setContext(value: string) {
    this.context.next(value);
  }

  getContext(): Observable<string> {
    return this.context;
  }
}