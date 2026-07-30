import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSavingsTableComponent } from './group-savings-table.component';

describe('GroupSavingsTableComponent', () => {
  let component: GroupSavingsTableComponent;
  let fixture: ComponentFixture<GroupSavingsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GroupSavingsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupSavingsTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
