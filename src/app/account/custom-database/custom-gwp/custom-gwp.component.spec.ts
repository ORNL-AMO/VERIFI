import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomGWPComponent } from './custom-gwp.component';

describe('CustomGWPComponent', () => {
  let component: CustomGWPComponent;
  let fixture: ComponentFixture<CustomGWPComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomGWPComponent]
    });
    fixture = TestBed.createComponent(CustomGWPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
