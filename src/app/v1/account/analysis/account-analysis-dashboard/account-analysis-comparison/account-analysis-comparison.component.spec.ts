import { TestBed } from '@angular/core/testing';
import { AccountAnalysisComparisonComponent } from './account-analysis-comparison.component';
import { accountEntry, inventoryOutcome } from '../analysis-inventory.testing';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';

describe('Account comparison content', () => {
  it('renders setup and facility selections without a nested dialog and respects category visibility', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisComparisonComponent] }).createComponent(AccountAnalysisComparisonComponent);
    const outcome = inventoryOutcome();
    fixture.componentRef.setInput('cards', ['Second', 'First'].map(name => ({ ...accountEntry(name).card, outcome, outcomeDisplay: analysisOutcomeDisplay(outcome, 'energy') })));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    const names = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('thead tr:first-child th')).slice(0,3).map(node => node.textContent?.trim());
    expect(names).toEqual(['Setting', 'Second', 'First']);
    expect(fixture.nativeElement.textContent).toContain('Facility analysis selections');
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody th')).map(node => node.textContent?.trim())).toContain('Category');
    fixture.componentRef.setInput('showCategory', false); fixture.detectChanges();
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody th')).map(node => node.textContent?.trim())).not.toContain('Category');
  });
});
