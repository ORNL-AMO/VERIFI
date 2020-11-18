import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMeterFormComponent } from './edit-meter-form.component';

describe('EditMeterFormComponent', () => {
  let component: EditMeterFormComponent;
  let fixture: ComponentFixture<EditMeterFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditMeterFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditMeterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
