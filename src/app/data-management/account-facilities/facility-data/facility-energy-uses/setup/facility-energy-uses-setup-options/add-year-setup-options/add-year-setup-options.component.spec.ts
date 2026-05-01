import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddYearSetupOptionsComponent } from './add-year-setup-options.component';

describe('AddYearSetupOptionsComponent', () => {
  let component: AddYearSetupOptionsComponent;
  let fixture: ComponentFixture<AddYearSetupOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddYearSetupOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddYearSetupOptionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
