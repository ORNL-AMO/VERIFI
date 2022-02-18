import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupFacilitiesComponent } from './setup-facilities.component';

describe('SetupFacilitiesComponent', () => {
  let component: SetupFacilitiesComponent;
  let fixture: ComponentFixture<SetupFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetupFacilitiesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
