import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
    providedIn: 'root'
})
export class UtilityService {
  public utilities = new BehaviorSubject(1);

  constructor(private localStorage:LocalStorageService) { }

  getValue(): Observable<number> {
    // Keep users state
    if(this.localStorage.retrieve('utilities')) {
        this.utilities.next(this.localStorage.retrieve('utilities'));
    }
    return this.utilities.asObservable();
  }
  setValue(newValue): void {
    this.localStorage.store('utilities', newValue);
    this.utilities.next(newValue);
  }
}