import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherUtilityComponent } from './other-utility.component';

describe('OtherUtilityComponent', () => {
  let component: OtherUtilityComponent;
  let fixture: ComponentFixture<OtherUtilityComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OtherUtilityComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OtherUtilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
