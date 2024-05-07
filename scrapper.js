import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { Parser } from 'json2csv'

async function scrapeTable() {
  console.log('scrapping...')
  const url = 'https://www.coinbase.com/es/explore'
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Set custom headers
  await page.setExtraHTTPHeaders({
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  })

  await page.goto(url, { waitUntil: 'networkidle' })

  let html = await page.content()

  let $ = cheerio.load(html)

  function removeNonASCII(str) {
    // This pattern essentially matches any character that's not between
    // the unicode range of 0-255.
    return str.replace(/[^\x00-\x7F]/g, '')
  }

  // find the table, get headers
  const table = $('table.cds-table-top40r1')
  const headers = []
  table.find('th').each((i, elem) => {
    headers.push(removeNonASCII($(elem).text().trim()))
  })

  // get rows
  const rows = []
  table.find('tr').each((i, elem) => {
    const row = {}
    $(elem)
      .find('td')
      .each((j, cell) => {
        row[headers[j]] = removeNonASCII($(cell).text().trim())
      })
    if (Object.keys(row).length > 0) {
      rows.push(row)
    }
  })

  await browser.close()

  if (!rows.length) {
    console.error('Imposible to get the data.')
    return
  }
  const json2csvParser = new Parser()
  const csv = json2csvParser.parse(rows)

  let datestamp = new Date()
  let formattedDate = `${datestamp.getFullYear()}-${datestamp.getMonth() + 1}-${datestamp.getDate()}_${datestamp.getHours()}-${datestamp.getMinutes()}-${datestamp.getSeconds()}`

  fs.writeFile(`coinbase_${formattedDate}.csv`, csv, (err) => {
    if (err) throw err
    console.log('CSV successfully generated.')
  })
}

scrapeTable()
