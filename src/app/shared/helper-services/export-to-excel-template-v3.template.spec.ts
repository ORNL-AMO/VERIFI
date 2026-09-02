import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';

const TEMPLATE_PATH = join(process.cwd(), 'src/assets/csv_templates/VERIFI-Import-Data.xlsx');
const TEMPLATE_SIZE_LIMIT_BYTES = 1_500_000;
const XLSX_XML_PATTERN = /\.(xml|rels)$/;
const MICROSOFT_365_ONLY_FORMULAS = /(?:_xlfn\.|_xlws\.|\b(?:FILTER|SORT|SORTBY|UNIQUE|SEQUENCE|RANDARRAY|XLOOKUP|XMATCH|LET|TAKE|DROP|CHOOSECOLS|HSTACK|VSTACK|TEXTSPLIT|WRAPROWS|TOCOL|TOROW|BYROW|BYCOL|MAP|REDUCE|SCAN|LAMBDA)\s*\()/i;

describe('VERIFI V3 import template asset', () => {
  it('keeps the workbook package optimized and Excel 2016 compatible', async () => {
    const zip = await loadTemplateZip();
    const packageText = await getPackageXmlText(zip);
    const packageFileNames = Object.keys(zip.files);

    expect(statSync(TEMPLATE_PATH).size).toBeLessThan(TEMPLATE_SIZE_LIMIT_BYTES);
    expect(zip.file('xl/calcChain.xml')).toBeNull();
    expect(packageFileNames.some(fileName => fileName.endsWith('.vml'))).toBe(false);
    expect(packageFileNames.some(fileName => /threadedComments|comments\d+\.xml|persons\/person\.xml/i.test(fileName))).toBe(false);
    expect(packageText).not.toContain('calcChain');
    expect(packageText).not.toContain('#REF!');
    expect(packageText).not.toContain('1048576');
    expect(packageText).not.toContain('t="array"');
    expect(packageText).not.toMatch(/threadedComment|comments1\.xml|persons\/person\.xml|vmlDrawing/i);
    expect(packageText).not.toMatch(MICROSOFT_365_ONLY_FORMULAS);

    const workbookXml = await readZipText(zip, 'xl/workbook.xml');
    expect(workbookXml).toContain('calcMode="auto"');
    expect(workbookXml).toContain('fullCalcOnLoad="1"');
    expect(workbookXml).toContain('forceFullCalc="1"');
    expect(workbookXml).toContain('name="V3"');
    expect(workbookXml).toContain('state="hidden"');

    const tableFiles = Object.keys(zip.files).filter(fileName => /^xl\/tables\/table\d+\.xml$/.test(fileName));
    expect(tableFiles.length).toBe(15);
    expect(await readZipText(zip, 'xl/tables/table1.xml')).toContain('name="VERIFI_Facilities"');
    expect(await readZipText(zip, 'xl/tables/table1.xml')).toContain('ref="A2:K202"');
    expect(await readZipText(zip, 'xl/tables/table3.xml')).toContain('name="VERIFI_Electricity_Data"');
    expect(await readZipText(zip, 'xl/tables/table3.xml')).toContain('ref="A2:F502"');

    // Remaining INDIRECT use backs Excel 2016-compatible dependent dropdown/helper behavior.
    expect(await getFilesContaining(zip, 'INDIRECT(')).toEqual([
      'xl/worksheets/sheet10.xml',
      'xl/worksheets/sheet19.xml',
      'xl/worksheets/sheet2.xml',
      'xl/worksheets/sheet24.xml',
      'xl/worksheets/sheet7.xml'
    ]);
  });

  it('preserves required template features through ExcelJS load and write', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(readTemplateArrayBuffer());
    workbook.calcProperties.fullCalcOnLoad = true;

    const roundTripBuffer = await workbook.xlsx.writeBuffer();
    const zip = await JSZip.loadAsync(toArrayBuffer(roundTripBuffer));
    const packageText = await getPackageXmlText(zip);
    const workbookXml = await readZipText(zip, 'xl/workbook.xml');

    expect(zip.file('xl/calcChain.xml')).toBeNull();
    expect(packageText).not.toContain('calcChain');
    expect(Object.keys(zip.files).filter(fileName => /^xl\/tables\/table\d+\.xml$/.test(fileName)).length).toBe(15);
    expect(packageText).toContain('VERIFI_Facilities');
    expect(packageText).toContain('ref="A2:K202"');
    expect(packageText).toContain('headerRowCount="1"');
    expect(packageText).toContain('sheetProtection');
    expect(packageText).toContain('dataValidations');
    expect(packageText).toContain('Options_US_States');
    expect(packageText).toContain('List_Facilities');
    expect(packageText).toContain('List_ChargeNumbers_Electricial');
    expect(workbookXml).toContain('name="V3"');
    expect(workbookXml).toContain('state="hidden"');
    expect(workbookXml).toContain('fullCalcOnLoad="1"');
    expect(packageText).not.toContain('#REF!');
    expect(packageText).not.toContain('1048576');
  });
});

async function loadTemplateZip(): Promise<JSZip> {
  return JSZip.loadAsync(readFileSync(TEMPLATE_PATH));
}

function readTemplateArrayBuffer(): ArrayBuffer {
  const buffer = readFileSync(TEMPLATE_PATH);
  return toArrayBuffer(buffer);
}

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

async function getPackageXmlText(zip: JSZip): Promise<string> {
  const xmlFileNames = Object.keys(zip.files).filter(fileName => XLSX_XML_PATTERN.test(fileName));
  const xmlFileContents = await Promise.all(xmlFileNames.map(fileName => readZipText(zip, fileName)));
  return xmlFileContents.join('\n');
}

async function getFilesContaining(zip: JSZip, text: string): Promise<Array<string>> {
  const xmlFileNames = Object.keys(zip.files).filter(fileName => XLSX_XML_PATTERN.test(fileName));
  const matchingFileNames = [];
  for (const fileName of xmlFileNames) {
    const fileText = await readZipText(zip, fileName);
    if (fileText.includes(text)) {
      matchingFileNames.push(fileName);
    }
  }
  return matchingFileNames.sort();
}

async function readZipText(zip: JSZip, fileName: string): Promise<string> {
  const zipFile = zip.file(fileName);
  if (!zipFile) {
    throw new Error(`Missing ${fileName} in VERIFI import template`);
  }
  return zipFile.async('string');
}
