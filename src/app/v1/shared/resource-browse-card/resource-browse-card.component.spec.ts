import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ResourceBrowseCardComponent } from './resource-browse-card.component';

describe('ResourceBrowseCardComponent', () => {
  let fixture: ComponentFixture<ResourceBrowseCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ResourceBrowseCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(ResourceBrowseCardComponent);
  });

  it('renders prepared optional sections with accessible title and action labels', () => {
    fixture.componentRef.setInput('view', {
      title: 'Resource A',
      openLabel: 'Open Resource A settings',
      icon: 'chartLine',
      owner: { label: 'Facility A', icon: 'facility' },
      chips: [{ id: 'type', label: 'Standard' }],
      factSections: [{ id: 'facts', facts: [{ id: 'count', label: 'Entries', valueLabel: '12' }] }],
      notes: [{ id: 'note', label: 'Review this resource', icon: 'warning' }],
      footerTag: { label: 'Monthly', icon: 'calendar' }
    });
    fixture.componentRef.setInput('actions', [{ id: 'readings', label: 'Open readings', icon: 'table' }]);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[aria-label="Open Resource A settings"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Open readings"]')).not.toBeNull();
    expect(element.textContent).toContain('Facility A');
    expect(element.textContent).toContain('Entries');
    expect(element.textContent).toContain('Review this resource');
  });

  it('emits open and enabled action intents but ignores disabled actions', () => {
    fixture.componentRef.setInput('view', { title: 'Resource A', openLabel: 'Open Resource A', icon: 'chartLine' });
    fixture.componentRef.setInput('actions', [
      { id: 'enabled', label: 'Enabled action', icon: 'table' },
      { id: 'disabled', label: 'Disabled action', icon: 'delete', disabled: true }
    ]);
    const opened = vi.fn();
    const selected = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);
    fixture.componentInstance.actionSelected.subscribe(selected);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[aria-label="Open Resource A"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[aria-label="Enabled action"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[aria-label="Disabled action"]') as HTMLButtonElement).click();

    expect(opened).toHaveBeenCalledOnce();
    expect(selected).toHaveBeenCalledWith('enabled');
    expect(selected).not.toHaveBeenCalledWith('disabled');
  });

  it('shows loading and unavailable fact presentation', () => {
    fixture.componentRef.setInput('view', {
      title: 'Resource A',
      openLabel: 'Open Resource A',
      icon: 'chartLine',
      loading: true,
      loadingLabel: 'Loading Resource A facts',
      factSections: [{
        id: 'facts',
        facts: [
          { id: 'loading', label: 'Latest', valueLabel: 'Not available', loading: true },
          { id: 'unavailable', label: 'Average', valueLabel: 'Not available', unavailable: true }
        ]
      }]
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.placeholder')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Loading Resource A facts');
    expect(fixture.nativeElement.textContent).toContain('Calculating Latest');
    expect(fixture.nativeElement.querySelector('.v1-resource-browse-card__fact-value--unavailable')).not.toBeNull();
  });
});
