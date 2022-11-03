import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterTableComponent } from './facility-water-table.component';

describe('FacilityWaterTableComponent', () => {
  let component: FacilityWaterTableComponent;
  let fixture: ComponentFixture<FacilityWaterTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityWaterTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityWaterTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
