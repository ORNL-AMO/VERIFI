import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualOperatingConditionsFormComponent } from './annual-operating-conditions-form.component';

describe('AnnualOperatingConditionsFormComponent', () => {
  let component: AnnualOperatingConditionsFormComponent;
  let fixture: ComponentFixture<AnnualOperatingConditionsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualOperatingConditionsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualOperatingConditionsFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
