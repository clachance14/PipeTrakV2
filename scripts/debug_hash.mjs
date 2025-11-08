import crypto from 'crypto'

const correctToken = 'nMndv8a7Yd1U4bSkTHUHNsSG4yTdkonqXdcMnWF1VQ8'
const wrongHash = '6f520c4d64cc271d745c25ffd7437ab12892327469c2e07c3f52dc4aa36db824'

// What the browser is calculating
console.log('Correct token:', correctToken)
console.log('Correct hash:', crypto.createHash('sha256').update(correctToken).digest('hex'))
console.log('')
console.log('Browser is looking for hash:', wrongHash)

// Try URL encoding variations
const urlDecoded = decodeURIComponent(correctToken)
console.log('\nURL decoded token:', urlDecoded)
console.log('Hash of URL decoded:', crypto.createHash('sha256').update(urlDecoded).digest('hex'))

// Maybe there's some encoding issue?
const variations = [
  correctToken + '\n',
  correctToken + '\r',
  ' ' + correctToken,
  correctToken + ' ',
]

console.log('\nTrying variations:')
variations.forEach(v => {
  const h = crypto.createHash('sha256').update(v).digest('hex')
  console.log(`"${v}" -> ${h}`)
})
