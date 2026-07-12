import type { EntryType } from './schemas/entry'

export interface Car {
  id: number
  ownerId: number
  brand: string
  model: string
  year: number | null
  plateNumber: string | null
  vin: string | null
  currentMileage: number
  photoUrl: string | null
  createdAt: string
}

export interface CarMember {
  id: number
  role: 'owner' | 'member'
  user: { id: number; email: string; name: string }
}

export interface CarDetail extends Car {
  role: 'owner' | 'member'
  members: CarMember[]
}

export interface Category {
  id: number
  name: string
  isDefault: boolean
}

export interface Entry {
  id: number
  carId: number
  authorId: number
  date: string
  type: EntryType
  categoryId: number | null
  category: Category | null
  description: string
  mileage: number | null
  cost: number | null
  currency: string
  place: string | null
  createdAt: string
}
