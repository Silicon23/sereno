import { parse } from 'csv-parse'
import fs from 'fs'
import path from 'path'

// Read and parse the CSV file
const csvFilePath = path.resolve('lib/data/music_metadata.csv');
const csvData = fs.readFileSync(csvFilePath, 'utf8');
let records: any[] = [];

parse(csvData, {
    columns: true,
    skip_empty_lines: true
}, (err, output) => {
    if (err) {
        throw new Error('Error parsing CSV data');
    }
    records = output;
});

console.log(records)