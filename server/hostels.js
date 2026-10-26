import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const dataDirectory = fileURLToPath(new URL('../data/', import.meta.url))
const workbookFiles = ['siri_hostels.xlsx', 'balaji_pg.xlsx', 'sairam_mens.xlsx']

const requiredColumns = [
  'hostel_name',
  'location',
  'sharing',
  'ac_non_ac',
  'price',
  'available_beds',
]

export function loadAllHostels() {
  return workbookFiles.flatMap((filename) => {
    const workbookPath = path.join(dataDirectory, filename)
    let workbook
    try {
      workbook = XLSX.readFile(workbookPath)
    } catch (error) {
      throw new Error(`Unable to read workbook ${filename}: ${error.message}`, { cause: error })
    }
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

    if (!firstSheet) {
      throw new Error(`Workbook ${filename} does not contain a worksheet`)
    }

    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
    if (rows.length === 0) {
      throw new Error(`Workbook ${filename} does not contain any hostel listings`)
    }

    return rows.map((row, index) => {
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([column, value]) => [column.trim().toLowerCase(), value]),
      )
      const missingColumns = requiredColumns.filter((column) => !(column in normalizedRow))
      if (missingColumns.length > 0) {
        throw new Error(
          `Workbook ${filename}, row ${index + 2} is missing columns: ${missingColumns.join(', ')}`,
        )
      }

      const parseNumber = (column) => {
        const value = normalizedRow[column]
        if (typeof value === 'string' && !value.trim()) {
          throw new Error(
            `Workbook ${filename}, row ${index + 2} has an empty ${column} value`,
          )
        }
        const cleaned = typeof value === 'string'
          ? value.trim().replace(/^(?:₹|rs\.?)\s*/i, '').replaceAll(',', '')
          : value
        const number = Number(cleaned)
        if (!Number.isFinite(number) || number < 0) {
          throw new Error(
            `Workbook ${filename}, row ${index + 2} has an invalid ${column}: ${String(value)}`,
          )
        }
        return number
      }

      const hostelName = String(normalizedRow.hostel_name).trim()
      const location = String(normalizedRow.location).trim()
      const sharing = String(normalizedRow.sharing).trim()
      const acNonAc = String(normalizedRow.ac_non_ac).trim()
      const price = parseNumber('price')
      const availableBeds = parseNumber('available_beds')
      if (!hostelName || !location || !sharing || !acNonAc) {
        throw new Error(`Workbook ${filename}, row ${index + 2} contains an empty required value`)
      }
      if (!Number.isInteger(availableBeds)) {
        throw new Error(`Workbook ${filename}, row ${index + 2} has a non-integer available_beds value`)
      }

      return {
        hostel_name: hostelName,
        location,
        sharing,
        ac_non_ac: acNonAc,
        price,
        available_beds: availableBeds,
      }
    })
  })
}

export function filterHostels(hostels, filters = {}) {
  const normalized = (value) => String(value ?? '').trim().toLowerCase()
  const location = normalized(filters.location)
  const sharing = normalized(filters.sharing)
  const acNonAc = normalized(filters.ac_non_ac)

  return hostels.filter((hostel) => (
    (!location || normalized(hostel.location).includes(location)) &&
    (!sharing || normalized(hostel.sharing).includes(sharing)) &&
    (!acNonAc || normalized(hostel.ac_non_ac).replace(/[\s-]/g, '') === acNonAc.replace(/[\s-]/g, '')) &&
    (filters.max_price === undefined || hostel.price <= filters.max_price) &&
    (filters.strict_max_price === undefined || hostel.price < filters.strict_max_price) &&
    (filters.min_available_beds === undefined || hostel.available_beds >= filters.min_available_beds)
  ))
}

export function answerListingQuestion(message, hostels) {
  const query = message.toLowerCase()
  const genericNameWords = new Set([
    'comfort', 'executive', 'hostel', 'homes', 'men', 'mens', 'pg', 'premium',
    'residency', 'room', 'rooms', 'single', 'stay', 'student',
  ])
  const queryWords = new Set(query.match(/[a-z0-9]+/g) ?? [])
  const mentionedNameWords = new Set(
    hostels.flatMap((hostel) => hostel.hostel_name.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((word) => word.length > 2 && !genericNameWords.has(word) && queryWords.has(word)),
  )
  const namedHostels = mentionedNameWords.size > 0
    ? hostels.filter((hostel) => {
      const nameWords = hostel.hostel_name.toLowerCase().match(/[a-z0-9]+/g) ?? []
      return [...mentionedNameWords].every((word) => nameWords.includes(word))
    })
    : []

  if (/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(query)) {
    return 'Hi! I can help you find rooms by location, budget, sharing type, AC status, and available beds. What are you looking for?'
  }

  const filters = {}
  if (/\bnon[\s-]?ac\b/.test(query)) {
    filters.ac_non_ac = 'non-ac'
  } else if (/\bac\b/.test(query)) {
    filters.ac_non_ac = 'ac'
  }

  const priceMatch = query.match(
    /\b(?:under|below|less than|up to|upto|within)\s*(?:₹|rs\.?\s*)?([\d,]+)/,
  )
  if (priceMatch) {
    filters.max_price = Number(priceMatch[1].replaceAll(',', ''))
    if (/^(under|below|less than)\b/.test(priceMatch[0])) {
      filters.strict_max_price = filters.max_price
    }
  }

  const asksAvailability = (
    /\b(how many|number of|count)\b/.test(query) && /\b(rooms?|beds?)\b/.test(query)
  ) || /\b(available|availability|vacan\w*)\b/.test(query)

  if (asksAvailability) {
    const availabilityScope = namedHostels.length > 0 ? namedHostels : hostels
    const availabilityListings = filterHostels(availabilityScope, filters)
    const beds = availabilityListings.reduce((total, hostel) => total + hostel.available_beds, 0)
    const name = namedHostels.length > 0
      ? [...new Set(namedHostels.map((hostel) => hostel.hostel_name))].join(', ')
      : 'all hostel listings'
    const breakdown = availabilityListings
      .map((hostel) => `${hostel.hostel_name}: ${hostel.available_beds} available ${hostel.available_beds === 1 ? 'bed' : 'beds'}`)
      .join('; ')

    return `The listings show ${beds} available ${beds === 1 ? 'bed' : 'beds'} across ${availabilityListings.length} ${availabilityListings.length === 1 ? 'listing' : 'listings'} for ${name}. ${breakdown}. The spreadsheet tracks available beds, not room counts, so an exact number of rooms isn't available.`
  }

  if (Object.keys(filters).length > 0) {
    const matches = filterHostels(hostels, filters)
    if (matches.length === 0) {
      const criteria = [
        filters.ac_non_ac && filters.ac_non_ac.toUpperCase(),
        filters.max_price !== undefined && `under ₹${filters.max_price.toLocaleString('en-IN')}`,
      ].filter(Boolean).join(' ')
      return `I couldn't find any listings matching ${criteria}. Try a different budget or AC preference.`
    }

    const criteria = [
      filters.ac_non_ac && filters.ac_non_ac.toUpperCase(),
      filters.max_price !== undefined && `under ₹${filters.max_price.toLocaleString('en-IN')}`,
    ].filter(Boolean).join(' ')
    const listingText = matches.map((hostel) => (
      `${hostel.hostel_name} — ${hostel.location}, ${hostel.sharing}, ${hostel.ac_non_ac}, ₹${hostel.price.toLocaleString('en-IN')}/month, ${hostel.available_beds} available ${hostel.available_beds === 1 ? 'bed' : 'beds'}`
    )).join('\n')

    return `Here ${matches.length === 1 ? 'is' : 'are'} ${matches.length} ${criteria} ${matches.length === 1 ? 'option' : 'options'} from the listings:\n${listingText}`
  }

  return null
}
