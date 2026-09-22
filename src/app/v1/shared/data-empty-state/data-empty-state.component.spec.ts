import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataEmptyStateModule } from './data-empty-state.module';

@Component({
  template: `
    <app-data-empty-state
      icon="fuel"
      title="No custom fuels"
      description="Add a custom fuel to get started.">
      <button type="button" (click)="add()">Add custom fuel</button>
    </app-data-empty-state>
  `,
  imports: [DataEmptyStateModule],
  standalone: true
})
class TestHostComponent {
  readonly add = vi.fn();
}

describe('DataEmptyStateComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent]
    });
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('presents a status with an icon, plain-language copy, and projected action', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('app-data-empty-state')?.getAttribute('role')).toBe('status');
    expect(element.querySelector('app-ui-icon')).toBeTruthy();
    expect(element.querySelector('h2')?.textContent).toContain('No custom fuels');
    expect(element.querySelector('p')?.textContent).toContain('Add a custom fuel to get started.');

    (element.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.add).toHaveBeenCalled();
  });
});
