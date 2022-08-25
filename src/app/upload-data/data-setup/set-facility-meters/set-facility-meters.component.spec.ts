import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetFacilityMetersComponent } from './set-facility-meters.component';

describe('SetFacilityMetersComponent', () => {
  let component: SetFacilityMetersComponent;
  let fixture: ComponentFixture<SetFacilityMetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetFacilityMetersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetFacilityMetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
