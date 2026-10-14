import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildAppLink, isMailEnabled, sendMail } from '../../server/utils/mail'

const outboxDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'garage-mail-')), 'outbox')

afterAll(() => {
  fs.rmSync(path.dirname(outboxDir), { recursive: true, force: true })
})

describe('sendMail (outbox)', () => {
  it('пишет письмо JSON-файлом в каталог', async () => {
    await sendMail(
      { to: 'a@b.ru', subject: 'Тема', text: 'Текст', html: '<p>Текст</p>' },
      { smtpUrl: '', from: 'Гараж <no-reply@x.ru>', outboxDir },
    )
    const files = fs.readdirSync(outboxDir)
    expect(files).toHaveLength(1)
    const mail = JSON.parse(fs.readFileSync(path.join(outboxDir, files[0]!), 'utf8'))
    expect(mail).toEqual({
      from: 'Гараж <no-reply@x.ru>',
      to: 'a@b.ru',
      subject: 'Тема',
      text: 'Текст',
      html: '<p>Текст</p>',
    })
  })

  it('без SMTP и outbox бросает ошибку', async () => {
    await expect(
      sendMail(
        { to: 'a@b.ru', subject: 's', text: 't' },
        { smtpUrl: '', from: 'x', outboxDir: '' },
      ),
    ).rejects.toThrow(/disabled/)
  })
})

describe('isMailEnabled / buildAppLink', () => {
  it('включена при SMTP или outbox', () => {
    expect(isMailEnabled({ smtpUrl: '', outboxDir: '' })).toBe(false)
    expect(isMailEnabled({ smtpUrl: 'smtp://h', outboxDir: '' })).toBe(true)
    expect(isMailEnabled({ smtpUrl: '', outboxDir: '/tmp/o' })).toBe(true)
  })

  it('склеивает базу и путь без двойных слэшей', () => {
    expect(buildAppLink('https://g.ru/', '/reset?token=1')).toBe('https://g.ru/reset?token=1')
    expect(buildAppLink('https://g.ru', 'reset')).toBe('https://g.ru/reset')
  })
})
