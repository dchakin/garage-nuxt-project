import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

// Тот же алгоритм и формат хэша, что был у nuxt-auth-utils (scrypt из @adonisjs/hash),
// поэтому пароли уже зарегистрированных пользователей продолжают проверяться.
const hash = new Hash(new Scrypt({}))

export function hashPassword(password: string): Promise<string> {
  return hash.make(password)
}

export function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
  return hash.verify(hashedPassword, plainPassword)
}
