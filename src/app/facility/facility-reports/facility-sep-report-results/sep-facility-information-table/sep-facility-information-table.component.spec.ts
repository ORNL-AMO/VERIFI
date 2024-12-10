import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SepFacilityInformationTableComponent } from './sep-facility-information-table.component';

describe('SepFacilityInformationTableComponent', () => {
  let component: SepFacilityInformationTableComponent;
  let fixture: ComponentFixture<SepFacilityInformationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SepFacilityInformationTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SepFacilityInformationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
