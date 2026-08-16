import { describe, expect, test } from 'bun:test'
import { Bot } from 'grammy'
import { autoRetry } from '@grammyjs/auto-retry'

describe('autoRetry transformer', () => {
  test('registers on bot.api.config without throwing', () => {
    const bot = new Bot('123456:test-token')
    expect(() => bot.api.config.use(autoRetry())).not.toThrow()
  })
})
