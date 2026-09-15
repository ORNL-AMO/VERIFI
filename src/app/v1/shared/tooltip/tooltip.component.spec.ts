import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipComponent } from './tooltip.component';

@Component({
  template: `<app-ui-tooltip text="Saved values affect future results." label="Result warning"></app-ui-tooltip>`,
  imports: [TooltipComponent],
  standalone: true
})
class TooltipHostComponent { }

describe('TooltipComponent', () => {
  let fixture: ComponentFixture<TooltipHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
  });

  it('renders an accessible icon trigger with described tooltip content', () => {
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('.v1-tooltip');
    const content = element.querySelector<HTMLElement>('[role="tooltip"]');

    expect(button).not.toBeNull();
    expect(content).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('Result warning: Saved values affect future results.');
    expect(button?.getAttribute('aria-describedby')).toBe(content?.id);
    expect(content?.textContent).toContain('Saved values affect future results.');
  });
});
