import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterUsageDonutComponent } from './meter-usage-donut.component';

describe('MeterUsageDonutComponent', () => {
  let component: MeterUsageDonutComponent;
  let fixture: ComponentFixture<MeterUsageDonutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeterUsageDonutComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterUsageDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
