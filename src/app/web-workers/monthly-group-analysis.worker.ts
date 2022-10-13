/// <reference lib="webworker" />

import { MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "./classes/monthlyAnalysisSummaryClass";
import { MonthlyGroupAnalysisWASM } from "./classes/wasm-api/monthlyGroupAnalysisWASM";
// declare var Module: any;
addEventListener('message', ({ data }) => {
  console.log(self['Module']);
  console.log('helo')

  // console.time('initialize')
  self['Module'] = {
    onRuntimeInitialized: function () {
      console.log('WASM Initialized 2222');
      console.log(self['Module']);
      // console.timeEnd('initialize')

      setTimeout(() => {
        let test = new MonthlyGroupAnalysisWASM(self['Module'], data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
      }, 1000)

      //  postMessage(undefined);
      // postMessage(undefined);
    }
  }
  importScripts('assets/wasm-analysis.js')
  // console.log(window['Module'])
  // const binary = require('fs').readFileSync('assets/client.wasm');


  // const importObject = {
  //   imports: {
  //     imported_func(arg) {
  //       console.log(arg);
  //     },
  //   },
  // };
  // fetch('assets/client.wasm')
  // .then((response) => response.arrayBuffer())
  // .then((bytes) => WebAssembly.instantiate(bytes, importObject))
  // .then((result) => {console.log(result)});

  // WebAssembly.compileStreaming(fetch('assets/verifi-test.wasm'))
  // .then((mod) => {
  //   const importObject = {
  //     imports: {
  //       imported_func(arg) {
  //         console.log(arg);
  //       },
  //     },
  //   };
  //   console.log('instantiate');
  //   WebAssembly.instantiate(mod, importObject).then((instance) => {
  //     console.log(instance);
  //     // instance.exports.exported_func();
  //   });
  // });


  // let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
  // let monthlyAnalysisSummary: MonthlyAnalysisSummary = monthlyAnalysisSummaryClass.getResults();
  // postMessage(monthlyAnalysisSummary);
});
