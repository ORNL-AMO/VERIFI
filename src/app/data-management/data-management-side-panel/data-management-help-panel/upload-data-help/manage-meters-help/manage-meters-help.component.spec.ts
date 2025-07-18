import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageMetersHelpComponent } from './manage-meters-help.component';

describe('ManageMetersHelpComponent', () => {
  let component: ManageMetersHelpComponent;
  let fixture: ComponentFixture<ManageMetersHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageMetersHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageMetersHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
