export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState extends Required<ConfirmOptions> {
  open: boolean
}

function confirmState() {
  return useState<ConfirmState>('confirmDialog', () => ({
    open: false,
    title: 'Подтверждение',
    message: '',
    confirmText: 'Подтвердить',
    cancelText: 'Отмена',
    danger: false
  }))
}

// Module-scope, not reactive state: only one confirm dialog can be pending at a time.
let resolver: ((value: boolean) => void) | null = null

export function useConfirmDialog() {
  const dialog = confirmState()

  function confirm(options: ConfirmOptions): Promise<boolean> {
    // If a previous confirm is still awaiting a response, resolve it as cancelled.
    resolver?.(false)

    dialog.value = {
      open: true,
      title: options.title ?? 'Подтверждение',
      message: options.message,
      confirmText: options.confirmText ?? 'Подтвердить',
      cancelText: options.cancelText ?? 'Отмена',
      danger: options.danger ?? false
    }

    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function respond(value: boolean) {
    dialog.value.open = false
    resolver?.(value)
    resolver = null
  }

  return { dialog, confirm, respond }
}
