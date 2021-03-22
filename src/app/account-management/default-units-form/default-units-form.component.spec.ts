import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultUnitsFormComponent } from './default-units-form.component';

describe('DefaultUnitsFormComponent', () => {
  let component: DefaultUnitsFormComponent;
  let fixture: ComponentFixture<DefaultUnitsFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DefaultUnitsFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DefaultUnitsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
