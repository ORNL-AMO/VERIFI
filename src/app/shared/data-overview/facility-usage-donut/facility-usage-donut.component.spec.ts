import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityUsageDonutComponent } from './facility-usage-donut.component';

describe('FacilityUsageDonutComponent', () => {
  let component: FacilityUsageDonutComponent;
  let fixture: ComponentFixture<FacilityUsageDonutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityUsageDonutComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityUsageDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
