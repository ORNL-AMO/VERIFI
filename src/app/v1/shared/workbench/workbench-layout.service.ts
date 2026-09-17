import { Injectable, signal } from '@angular/core';
import { SessionStorageService } from 'ngx-webstorage';

const FACTS_EXPANDED_STORAGE_KEY = 'v1WorkbenchFactsExpanded';

@Injectable({ providedIn: 'root' })
export class WorkbenchLayoutService {
  private readonly factsExpandedState = signal(true);

  readonly factsExpanded = this.factsExpandedState.asReadonly();

  constructor(private sessionStorage: SessionStorageService) {
    const storedFactsExpanded = this.sessionStorage.retrieve(FACTS_EXPANDED_STORAGE_KEY);
    this.factsExpandedState.set(typeof storedFactsExpanded === 'boolean' ? storedFactsExpanded : true);
  }

  toggleFacts(): void {
    const factsExpanded = !this.factsExpanded();
    this.factsExpandedState.set(factsExpanded);
    this.sessionStorage.store(FACTS_EXPANDED_STORAGE_KEY, factsExpanded);
  }
}
