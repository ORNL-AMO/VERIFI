import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsMapComponent } from './facility-emissions-map.component';

describe('FacilityEmissionsMapComponent', () => {
  let component: FacilityEmissionsMapComponent;
  let fixture: ComponentFixture<FacilityEmissionsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEmissionsMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
