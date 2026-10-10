import { beforeEach, describe, expect, it } from 'vitest'
import { localTokenStore } from '../utils/authTokens'

const tokens = { accessToken: 'a', refreshToken: 'r', expiresIn: 900 }

beforeEach(() => {
  localStorage.clear()
})

describe('localTokenStore', () => {
  it('сохраняет, читает и очищает токены', () => {
    expect(localTokenStore.read()).toBeNull()
    localTokenStore.write(tokens)
    expect(localTokenStore.read()).toEqual(tokens)
    localTokenStore.clear()
    expect(localTokenStore.read()).toBeNull()
  })

  it('битые или неполные данные в хранилище читаются как «токенов нет»', () => {
    localStorage.setItem('garage-auth-tokens', '{не json')
    expect(localTokenStore.read()).toBeNull()
    localStorage.setItem('garage-auth-tokens', JSON.stringify({ accessToken: 'a' }))
    expect(localTokenStore.read()).toBeNull()
  })
})
