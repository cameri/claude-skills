import { describe, expect, test } from 'bun:test'
import { generateKeypair, keypairFromSecretKey, decodeNsec } from './identity'

describe('generateKeypair', () => {
  test('produces a valid nsec/npub pair that round-trips', () => {
    const kp = generateKeypair()
    expect(kp.nsec.startsWith('nsec1')).toBe(true)
    expect(kp.npub.startsWith('npub1')).toBe(true)
    expect(decodeNsec(kp.nsec)).toEqual(kp.sk)
  })

  test('generates a different keypair each call', () => {
    const a = generateKeypair()
    const b = generateKeypair()
    expect(a.nsec).not.toBe(b.nsec)
  })
})

describe('keypairFromSecretKey', () => {
  test('derives the same pubkey/npub/nsec for the same secret key', () => {
    const a = generateKeypair()
    const rebuilt = keypairFromSecretKey(a.sk)
    expect(rebuilt.pubkeyHex).toBe(a.pubkeyHex)
    expect(rebuilt.npub).toBe(a.npub)
    expect(rebuilt.nsec).toBe(a.nsec)
  })
})

describe('decodeNsec', () => {
  test('throws on a non-nsec bech32 string', () => {
    const kp = generateKeypair()
    expect(() => decodeNsec(kp.npub)).toThrow('not an nsec')
  })
})
