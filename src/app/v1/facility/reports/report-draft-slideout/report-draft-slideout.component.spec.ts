import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { FacilityReportType } from '@data/models/idbModels/facilityReport';
import { FacilityReportsModule } from '../facility-reports.module';
import { ReportDraftSlideoutComponent } from './report-draft-slideout.component';
import { FACILITY_REPORT_TYPES } from '../facility-report.models';

describe('ReportDraftSlideoutComponent', () => {
  it('provides every existing type for creation and disables edits during save', async () => {
    await TestBed.configureTestingModule({ imports: [FacilityReportsModule] }).compileComponents();
    const fixture = TestBed.createComponent(ReportDraftSlideoutComponent);
    fixture.componentRef.setInput('reportTypes', FACILITY_REPORT_TYPES);
    fixture.componentRef.setInput('form', new FormGroup({
      name: new FormControl('Report', { nonNullable: true }),
      type: new FormControl<FacilityReportType>('analysis', { nonNullable: true })
    }));
    expect(fixture.componentInstance.reportTypes).toHaveLength(7);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('option').length, fixture.nativeElement.innerHTML).toBe(7);
    expect(fixture.nativeElement.querySelector('select').classList.contains('v1-select')).toBe(true);
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('option')).toHaveLength(7);
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
  });
});
