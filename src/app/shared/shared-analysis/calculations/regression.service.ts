import { Injectable } from '@angular/core';
import * as jStat from 'jstat';


@Injectable({
  providedIn: 'root'
})
export class RegressionService {

  constructor() { }


  test() {
    var A = [[1, 2, 3],
    [1, 1, 0],
    [1, -2, 3],
    [1, 3, 4],
    [1, -10, 2],
    [1, 4, 4],
    [1, 10, 2],
    [1, 3, 2],
    [1, 4, -1]];
    var b = [1, -2, 3, 4, -5, 6, 7, -8, 9];
    var model = jStat.models.ols(b, A);
    console.log(model);
    // coefficient estimated
    console.log('coef')
    console.log(model.coef) // -> [0.662197222856431, 0.5855663255775336, 0.013512111085743017]

    // R2
    console.log('R2')
    console.log(model.R2) // -> 0.309

    // t test P-value
    console.log('t test P-value')
    console.log(model.t.p) // -> [0.8377444317889267, 0.15296736158442314, 0.9909627983826583]

    // f test P-value
    console.log('f test P-value')
    console.log(model.f.pvalue) // -> 0.3306363671859872
  }
}
