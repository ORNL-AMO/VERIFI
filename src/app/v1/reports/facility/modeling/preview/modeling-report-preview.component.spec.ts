import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FacilityModelingReportService } from '../modeling-report.service';
import { ModelingReportModule } from '../modeling-report.module';
import { ModelingReportPreviewComponent } from './modeling-report-preview.component';

describe('Modeling report preview recovery', () => {
  it('announces a processing error and delegates retry to the report session', async () => {
    const retry = vi.fn();
    await TestBed.configureTestingModule({ imports: [ModelingReportModule], providers: [
      { provide: FacilityModelingReportService, useValue: { view: signal(undefined), state: signal({ state: 'error', message: 'Model checks failed' }), retry } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(ModelingReportPreviewComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Model checks failed');
    fixture.nativeElement.querySelector('button').click(); expect(retry).toHaveBeenCalledOnce();
  });
});
