import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageMetersComponent } from './manage-meters.component';

describe('ManageMetersComponent', () => {
  let component: ManageMetersComponent;
  let fixture: ComponentFixture<ManageMetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageMetersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageMetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
