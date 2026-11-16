import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { DecisionSectionModule } from './decision-section.module';

@Component({ imports: [DecisionSectionModule, ReactiveFormsModule], template: '<app-visualization-decision-section nodeId="test-step" label="Test step" [expanded]="expanded" (expandedChange)="expanded = $event"><input [formControl]="control"></app-visualization-decision-section>' })
class Host { expanded = true; readonly control = new FormControl('retained', { nonNullable: true }); }

describe('expandable visualization decision section', () => {
  it('collapses mounted content without clearing values and exposes its expansion state', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement, toggle = root.querySelector<HTMLButtonElement>('button')!, input = root.querySelector<HTMLInputElement>('input')!;
    input.value = 'unfinished input'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(root.querySelector<HTMLElement>('#test-step-body')!.hidden).toBe(true);
    expect(root.querySelector('input')).toBe(input); expect(fixture.componentInstance.control.value).toBe('unfinished input');
    toggle.click(); fixture.detectChanges(); expect(input.value).toBe('unfinished input'); fixture.destroy(); TestBed.resetTestingModule();
  });
});
