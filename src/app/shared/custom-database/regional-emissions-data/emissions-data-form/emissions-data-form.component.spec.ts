import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsDataFormComponent } from './emissions-data-form.component';

describe('EmissionsDataFormComponent', () => {
  let component: EmissionsDataFormComponent;
  let fixture: ComponentFixture<EmissionsDataFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsDataFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsDataFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
