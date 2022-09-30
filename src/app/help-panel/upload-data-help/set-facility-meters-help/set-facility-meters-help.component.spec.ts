import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetFacilityMetersHelpComponent } from './set-facility-meters-help.component';

describe('SetFacilityMetersHelpComponent', () => {
  let component: SetFacilityMetersHelpComponent;
  let fixture: ComponentFixture<SetFacilityMetersHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetFacilityMetersHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetFacilityMetersHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
