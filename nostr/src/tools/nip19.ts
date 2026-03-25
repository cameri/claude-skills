import * as nip19 from 'nostr-tools/nip19'

type Result = { content: { type: string; text: string }[] }

export function handleNip19Decode(args: Record<string, unknown>): Result {
  const input = args.bech32 as string
  if (!input) throw new Error('bech32 is required')

  let decoded: nip19.DecodeResult
  try {
    decoded = nip19.decode(input)
  } catch (e) {
    throw new Error(`Failed to decode: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { content: [{ type: 'text', text: JSON.stringify(decoded, null, 2) }] }
}

export function handleNip19Encode(args: Record<string, unknown>): Result {
  const type = args.type as string
  const data = args.data as Record<string, unknown> | string

  let result: string
  switch (type) {
    case 'npub':
      result = nip19.npubEncode(data as string)
      break
    case 'nsec':
      result = nip19.nsecEncode(data as Uint8Array)
      break
    case 'note':
      result = nip19.noteEncode(data as string)
      break
    case 'nprofile':
      result = nip19.nprofileEncode(data as nip19.ProfilePointer)
      break
    case 'nevent':
      result = nip19.neventEncode(data as nip19.EventPointer)
      break
    case 'naddr':
      result = nip19.naddrEncode(data as nip19.AddressPointer)
      break
    default:
      throw new Error(`Unknown type: ${type}. Valid: npub, note, nprofile, nevent, naddr`)
  }

  return { content: [{ type: 'text', text: result }] }
}
