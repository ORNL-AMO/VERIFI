import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootprintUploadSelectFacilityComponent } from './footprint-upload-select-facility.component';

describe('FootprintUploadSelectFacilityComponent', () => {
  let component: FootprintUploadSelectFacilityComponent;
  let fixture: ComponentFixture<FootprintUploadSelectFacilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FootprintUploadSelectFacilityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FootprintUploadSelectFacilityComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
