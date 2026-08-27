import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { V1Routes } from '../v1.routes';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';
import { GuidedBillsEntryComponent } from './guided-bills-entry.component';

describe('GuidedBillsEntryComponent', () => {
  let fixture: ComponentFixture<GuidedBillsEntryComponent>;
  let navigation: {
    facility: ReturnType<typeof vi.fn>;
    openFacility: ReturnType<typeof vi.fn>;
    showWelcome: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    navigation = {
      facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
      openFacility: vi.fn().mockResolvedValue(undefined),
      showWelcome: vi.fn()
    };

    TestBed.configureTestingModule({
      declarations: [GuidedBillsEntryComponent],
      providers: [
        { provide: WorkspaceNavigationService, useValue: navigation }
      ]
    });
    fixture = TestBed.createComponent(GuidedBillsEntryComponent);
    fixture.detectChanges();
  });

  it('renders the simple bills entry shell without full workspace language', () => {
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('#v1-guided-bills-title')?.textContent)
      .toContain('Start With Utility Bills');
    expect(text).toContain('Facility A is ready');
    expect(text).toContain('regression analysis');
    expect(text).toContain('Open full workspace');
    expect(text).not.toContain('account workspace');
  });

  it('opens the full facility workspace from the secondary action', () => {
    const button: HTMLButtonElement | undefined = Array
      .from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(item => item.textContent?.includes('Open full workspace'));

    button?.click();

    expect(navigation.openFacility).toHaveBeenCalledWith('facility-a');
  });

  it('registers the guarded v1 guided bills route', () => {
    const shellRoute = V1Routes[0];
    const guidedRoute = shellRoute.children?.find(route => route.path === 'guided-bills/:facilityGuid');

    expect(guidedRoute?.component).toBe(GuidedBillsEntryComponent);
    expect(guidedRoute?.canActivate).toBeTruthy();
  });
});
