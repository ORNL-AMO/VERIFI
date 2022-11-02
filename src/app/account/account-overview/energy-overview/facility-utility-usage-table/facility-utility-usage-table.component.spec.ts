import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityUtilityUsageTableComponent } from './facility-utility-usage-table.component';

describe('FacilityUtilityUsageTableComponent', () => {
  let component: FacilityUtilityUsageTableComponent;
  let fixture: ComponentFixture<FacilityUtilityUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityUtilityUsageTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityUtilityUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
