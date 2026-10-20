import { z } from 'zod'

export const MAX_CATEGORY_NAME_LENGTH = 40

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Укажите название категории')
    .max(MAX_CATEGORY_NAME_LENGTH, `Не длиннее ${MAX_CATEGORY_NAME_LENGTH} символов`),
})
export type CategoryInput = z.infer<typeof categorySchema>
