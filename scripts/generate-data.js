import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const rootDirectory = fileURLToPath(new URL('../', import.meta.url))
const dataDirectory = path.join(rootDirectory, 'data')
const columns = [
  'hostel_name',
  'location',
  'sharing',
  'ac_non_ac',
  'price',
  'available_beds',
]

const workbooks = {
  'siri_hostels.xlsx': [
    ['Siri Comfort Hostel', 'Wyra Road', '2 sharing', 'AC', 7500, 3],
    ['Siri Residency', 'Khammam Bus Stand', '3 sharing', 'Non-AC', 5200, 5],
    ['Siri Executive Stay', 'Mamillagudem', '1 sharing', 'AC', 9800, 1],
  ],
  'balaji_pg.xlsx': [
    ['Balaji Premium PG', 'Nehru Nagar', '2 sharing', 'AC', 8000, 2],
    ['Balaji Student Homes', 'VDO Colony', '3 sharing', 'Non-AC', 4800, 4],
    ['Balaji Comfort Rooms', 'Wyra Road', '2 sharing', 'Non-AC', 6000, 2],
  ],
  'sairam_mens.xlsx': [
    ['Sairam Mens Hostel', 'Khammam Bus Stand', '3 sharing', 'Non-AC', 5000, 6],
    ['Sairam Elite Stay', 'Nehru Nagar', '2 sharing', 'AC', 7800, 2],
    ['Sairam Single Rooms', 'Mamillagudem', '1 sharing', 'Non-AC', 6500, 1],
  ],
}

fs.mkdirSync(dataDirectory, { recursive: true })

for (const [filename, rows] of Object.entries(workbooks)) {
  const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hostels')
  XLSX.writeFile(workbook, path.join(dataDirectory, filename))
  console.log(`Created data/${filename}`)
}
