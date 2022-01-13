import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSetupComponent } from './group-setup.component';

describe('GroupSetupComponent', () => {
  let component: GroupSetupComponent;
  let fixture: ComponentFixture<GroupSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupSetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
