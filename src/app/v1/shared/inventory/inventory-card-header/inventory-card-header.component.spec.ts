import { TestBed } from '@angular/core/testing';
import { InventoryCardHeaderComponent } from './inventory-card-header.component';

describe('InventoryCardHeaderComponent', () => {
  it.each(['analysis', 'report'])('labels ownership for %s inventories', async resource => {
    await TestBed.configureTestingModule({ imports: [InventoryCardHeaderComponent] }).compileComponents();
    const fixture = TestBed.createComponent(InventoryCardHeaderComponent);
    fixture.componentRef.setInput('scope', 'account'); fixture.componentRef.setInput('resource', resource); fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe(`Account ${resource}`);
    fixture.componentRef.setInput('scope', 'facility'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe(`Facility ${resource}`);
    expect(fixture.nativeElement.getAttribute('data-scope')).toBe('facility');
  });
});
