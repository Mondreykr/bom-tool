import XLSX from 'xlsx';

const wb = XLSX.readFile('../test-data/258730-Rev2-Flat BOM-20260115.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Columns:', Object.keys(data[0]).join(', '));
console.log('\nFirst 5 rows with lengths:');
data.slice(0, 10).filter(r => r['Length']).forEach((r, i) => {
    console.log(`\nRow ${i+1}:`);
    console.log('  Part Number:', r['Part Number']);
    console.log('  Length:', r['Length']);
    console.log('  Qty:', r['Qty']);
    console.log('  Description:', r['Description']?.substring(0, 50));
});
