import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileSetupComponent } from './file-setup.component';

describe('FileSetupComponent', () => {
  let component: FileSetupComponent;
  let fixture: ComponentFixture<FileSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
