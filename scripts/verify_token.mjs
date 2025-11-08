import crypto from 'crypto'

const token = 'nMndv8a7Yd1U4bSkTHUHNsSG4yTdkonqXdcMnWF1VQ8'
const storedHash = '1976570571f6fa8745d64538e035ec7749ecd29ee4581cd865175ac704433518'

// Hash the token the same way the app does
const hash = crypto.createHash('sha256').update(token).digest('hex')

console.log('Token from email:', token)
console.log('Calculated hash:', hash)
console.log('Stored hash:    ', storedHash)
console.log('Match:', hash === storedHash ? '✅ YES' : '❌ NO')
