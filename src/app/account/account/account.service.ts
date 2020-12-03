import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
    providedIn: 'root'
})
export class AccountService {
  public accountId = new BehaviorSubject(1);
    
  constructor(private localStorage:LocalStorageService) { }

  // getValue(): Observable<number> {
  //   // Keep users state
  //   if(this.localStorage.retrieve('accountid')) {
  //       this.accountId.next(this.localStorage.retrieve('accountid'));
  //   }
  //   return this.accountId.asObservable();
  // }

  // setValue(newValue): void {
  //   this.localStorage.store('accountid', newValue);
  //   this.accountId.next(newValue);
  // }
}