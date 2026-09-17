import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityHomeComponent } from './facility-home.component';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

describe('FacilityHomeComponent', () => {
  it('displays the selected facility name', () => {
    const fixture: ComponentFixture<FacilityHomeComponent> = TestBed.configureTestingModule({
      declarations: [FacilityHomeComponent],
      imports: [IconsModule],
      providers: [
        { provide: WorkspaceNavigationService, useValue: createNavigation() },
        { provide: WorkspaceStatusService, useValue: createStatus() }
      ]
    }).createComponent(FacilityHomeComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Facility A');
  });
});

function createNavigation() {
  return {
    facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
    panelContent: vi.fn(() => ({
      results: [
        { value: '1' },
        { value: '4' },
        { value: '2' },
        { value: '3' },
        { value: '1' }
      ]
    }))
  };
}

function createStatus() {
  return {
    state: vi.fn(() => 'ready'),
    selectedFacilitySummary: vi.fn(() => ({ state: 'valid', total: 0, errorCount: 0, warningCount: 0, infoCount: 0 }))
  };
}
