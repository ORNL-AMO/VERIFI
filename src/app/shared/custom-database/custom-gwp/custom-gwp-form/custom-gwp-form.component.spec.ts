import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomGwpFormComponent } from './custom-gwp-form.component';

describe('CustomGwpFormComponent', () => {
  let component: CustomGwpFormComponent;
  let fixture: ComponentFixture<CustomGwpFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomGwpFormComponent]
    });
    fixture = TestBed.createComponent(CustomGwpFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
