import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// 这是 OWASP 给出的 scrypt 配置组合之一。参数越高，暴力猜密码的成本越大，
// 同时正常登录消耗的 CPU 和内存也越多，需要根据服务器能力压测后调整。
const SCRYPT_CONFIG = { N: 2 ** 15, r: 8, p: 3, maxmem: 128 * 1024 * 1024 }
const KEY_LENGTH = 64

function deriveKey(password: string, salt: Buffer, config = SCRYPT_CONFIG): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, config, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await deriveKey(password, salt)
  return [
    'scrypt',
    SCRYPT_CONFIG.N,
    SCRYPT_CONFIG.r,
    SCRYPT_CONFIG.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$')
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltBase64, hashBase64] = encoded.split('$')
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltBase64 || !hashBase64) return false

  const expected = Buffer.from(hashBase64, 'base64')
  const actual = await deriveKey(password, Buffer.from(saltBase64, 'base64'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * 1024 * 1024,
  })

  // timingSafeEqual 避免通过比较耗时推测哈希的匹配位置。
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

