import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeletingAccountDataComponent } from './deleting-account-data.component';

describe('DeletingAccountDataComponent', () => {
  let component: DeletingAccountDataComponent;
  let fixture: ComponentFixture<DeletingAccountDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletingAccountDataComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeletingAccountDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
