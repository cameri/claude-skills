import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Ctx } from '../types.js'
import { handleSend } from './send.js'
import { handleFetch } from './fetch.js'
import { handleRelayList } from './relay-list.js'
import { handleMetadata } from './metadata.js'
import { handleStatus } from './status.js'
import { handleNip19Decode, handleNip19Encode } from './nip19.js'
import { handleReact } from './react.js'
import { stats } from '../publisher.js'

export function registerTools(ctx: Ctx): void {
  const { mcp } = ctx

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'send_dm',
        description: 'Send an encrypted DM (NIP-04) to a Nostr pubkey. Use npub or hex format.',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: { type: 'string', description: 'Recipient npub or hex pubkey' },
            text: { type: 'string', description: 'Message text (will be encrypted)' },
          },
          required: ['recipient', 'text'],
        },
      },
      {
        name: 'send_dm_nip17',
        description: 'Send a NIP-17 private direct message (gift-wrapped, kind:1059) to a Nostr pubkey. More private than NIP-04 — hides sender, recipient, and timestamp via rumor→seal→gift-wrap chain.',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: { type: 'string', description: 'Recipient npub or hex pubkey' },
            text: { type: 'string', description: 'Message text (will be encrypted)' },
          },
          required: ['recipient', 'text'],
        },
      },
      {
        name: 'send_note',
        description: 'Publish a public kind:1 Nostr note.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Note content' },
            reply_to_event_id: { type: 'string', description: 'Event ID (hex or note1) to reply to' },
            reply_to_pubkey: { type: 'string', description: 'Author pubkey (hex or npub) to tag in reply' },
            mention_pubkeys: { type: 'array', items: { type: 'string' }, description: 'Pubkeys (hex or npub) to mention — adds p-tags without making it a reply' },
          },
          required: ['text'],
        },
      },
      {
        name: 'fetch_event',
        description: 'Fetch a specific Nostr event by ID, or by filter. Returns the event JSON.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Event ID in hex or note1 format' },
            pubkey: { type: 'string', description: 'Filter by author pubkey (hex or npub)' },
            kinds: { type: 'array', items: { type: 'number' }, description: 'Filter by event kinds' },
            limit: { type: 'number', description: 'Max events to return (default 1)' },
            timeout_ms: { type: 'number', description: 'Timeout in ms (default 5000)' },
          },
        },
      },
      {
        name: 'status',
        description: 'Get Nostr relay connection status, stats, and bot identity.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'publish_relay_list',
        description:
          'Publish a NIP-65 kind:10002 relay list. Before publishing, fetches the current list from each write relay and checks for conflicts. Returns conflict info if a newer remote list is found; set force:true to override.',
        inputSchema: {
          type: 'object',
          properties: {
            relays: {
              type: 'array',
              description: 'Relay entries to publish',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'Relay WebSocket URL' },
                  marker: {
                    type: 'string',
                    enum: ['read', 'write'],
                    description: 'Omit for read+write, or specify "read" or "write"',
                  },
                },
                required: ['url'],
              },
            },
            force: {
              type: 'boolean',
              description: 'Publish even if a newer relay list is found on a remote relay (default false)',
            },
          },
          required: ['relays'],
        },
      },
      {
        name: 'get_relay_list',
        description: 'Get the current NIP-65 relay list — from local cache and optionally fetched from write relays.',
        inputSchema: {
          type: 'object',
          properties: {
            fetch_remote: {
              type: 'boolean',
              description: 'Also fetch the current kind:10002 from each write relay (default false)',
            },
          },
        },
      },
      {
        name: 'nip19_decode',
        description: 'Decode a NIP-19 bech32 entity (note1, npub1, nevent1, nprofile1, naddr1, nsec1) into its components.',
        inputSchema: {
          type: 'object',
          properties: {
            bech32: { type: 'string', description: 'The bech32 string to decode' },
          },
          required: ['bech32'],
        },
      },
      {
        name: 'nip19_encode',
        description: 'Encode a Nostr entity into a NIP-19 bech32 string.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['npub', 'note', 'nprofile', 'nevent', 'naddr'],
              description: 'Entity type to encode',
            },
            data: {
              description: 'Entity data. For npub/note: hex string. For nprofile: {pubkey, relays?}. For nevent: {id, relays?, author?, kind?}. For naddr: {identifier, pubkey, kind, relays?}.',
            },
          },
          required: ['type', 'data'],
        },
      },
      {
        name: 'react',
        description: 'Publish a NIP-25 kind:7 reaction to a Nostr event. Use "+" for like, "-" for dislike, or any emoji.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Event ID to react to (hex, note1, or nevent1)' },
            content: { type: 'string', description: 'Reaction content: "+" (like), "-" (dislike), or an emoji (default: "+")' },
            author_pubkey: { type: 'string', description: 'Pubkey of the event author (hex or npub) — adds a "p" tag' },
            target_kind: { type: 'number', description: 'Kind of the target event — adds a "k" tag (recommended)' },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'publish_metadata',
        description: 'Publish a kind:0 profile metadata event to update the Nostr identity. Saves a local profile cache.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Short username / handle' },
            display_name: { type: 'string', description: 'Display name shown in clients' },
            about: { type: 'string', description: 'Bio / about text' },
            picture: { type: 'string', description: 'Avatar image URL' },
            website: { type: 'string', description: 'Website URL' },
            nip05: { type: 'string', description: 'NIP-05 identifier (user@domain)' },
            lud16: { type: 'string', description: 'Lightning address (user@domain)' },
          },
        },
      },
    ],
  }))

  mcp.setRequestHandler(CallToolRequestSchema, async req => {
    const args = (req.params.arguments ?? {}) as Record<string, unknown>
    try {
      switch (req.params.name) {
        case 'send_dm':
        case 'send_dm_nip17':
        case 'send_note':
          return await handleSend(req.params.name, args, ctx)
        case 'fetch_event':
          return await handleFetch(args, ctx)
        case 'status':
          return handleStatus(ctx)
        case 'publish_relay_list':
        case 'get_relay_list':
          return await handleRelayList(req.params.name, args, ctx)
        case 'nip19_decode':
          return handleNip19Decode(args)
        case 'nip19_encode':
          return handleNip19Encode(args)
        case 'react':
          return await handleReact(args, ctx)
        case 'publish_metadata':
          return await handleMetadata(args, ctx)
        default:
          throw new Error(`unknown tool: ${req.params.name}`)
      }
    } catch (e) {
      stats.messages.failed++
      return {
        content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
        isError: true,
      }
    }
  })
}
