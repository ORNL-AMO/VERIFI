import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessMeterReadingsComponent } from './process-meter-readings.component';

describe('ProcessMeterReadingsComponent', () => {
  let component: ProcessMeterReadingsComponent;
  let fixture: ComponentFixture<ProcessMeterReadingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessMeterReadingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessMeterReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
