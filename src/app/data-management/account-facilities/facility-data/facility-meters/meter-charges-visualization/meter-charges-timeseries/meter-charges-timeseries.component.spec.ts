import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterChargesTimeseriesComponent } from './meter-charges-timeseries.component';

describe('MeterChargesTimeseriesComponent', () => {
  let component: MeterChargesTimeseriesComponent;
  let fixture: ComponentFixture<MeterChargesTimeseriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterChargesTimeseriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterChargesTimeseriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
