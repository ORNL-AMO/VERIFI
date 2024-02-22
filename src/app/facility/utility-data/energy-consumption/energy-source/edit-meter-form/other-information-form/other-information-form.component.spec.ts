import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherInformationFormComponent } from './other-information-form.component';

describe('OtherInformationFormComponent', () => {
  let component: OtherInformationFormComponent;
  let fixture: ComponentFixture<OtherInformationFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtherInformationFormComponent]
    });
    fixture = TestBed.createComponent(OtherInformationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
