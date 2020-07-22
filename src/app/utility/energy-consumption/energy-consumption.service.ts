import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnergyConsumptionService {

public energySource = new BehaviorSubject(null);
    
  constructor() { }

  getValue(): Observable<number> {
    // Keep users state
    return this.energySource.asObservable();
  }

  setValue(newValue): void {
    this.energySource.next(newValue);
  }

}