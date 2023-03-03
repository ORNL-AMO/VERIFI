import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityTitlePageComponent } from './facility-title-page.component';

describe('FacilityTitlePageComponent', () => {
  let component: FacilityTitlePageComponent;
  let fixture: ComponentFixture<FacilityTitlePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityTitlePageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityTitlePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
