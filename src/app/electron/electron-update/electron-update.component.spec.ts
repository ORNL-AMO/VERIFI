import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectronUpdateComponent } from './electron-update.component';

describe('ElectronUpdateComponent', () => {
  let component: ElectronUpdateComponent;
  let fixture: ComponentFixture<ElectronUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ElectronUpdateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ElectronUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
