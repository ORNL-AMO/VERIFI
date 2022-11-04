import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsTableComponent } from './facility-emissions-table.component';

describe('FacilityEmissionsTableComponent', () => {
  let component: FacilityEmissionsTableComponent;
  let fixture: ComponentFixture<FacilityEmissionsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEmissionsTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
