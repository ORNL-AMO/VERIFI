import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMeterGroupFormComponent } from './edit-meter-group-form.component';

describe('EditMeterGroupFormComponent', () => {
  let component: EditMeterGroupFormComponent;
  let fixture: ComponentFixture<EditMeterGroupFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditMeterGroupFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditMeterGroupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
