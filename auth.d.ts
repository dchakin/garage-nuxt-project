// Типизация сессии nuxt-auth-utils: поля, которые кладутся в setUserSession
// (см. server/api/auth/login.post.ts и register.post.ts)
declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    name: string
  }
}

export {}
