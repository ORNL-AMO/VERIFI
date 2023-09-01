/// <reference lib="webworker" />

import { CarbonReport } from "../calculations/carbon-calculations/carbonReport";


addEventListener('message', ({ data }) => {
    try {
        let carbonReport: CarbonReport = new CarbonReport();
        console.log('hello')
        postMessage({
            error: false,
            carbonReport: carbonReport
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            carbonReport: undefined
        });
    }
});
