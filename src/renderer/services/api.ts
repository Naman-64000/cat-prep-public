export type AppResponse<T extends object> =
  | ({ success: true } & T)
  | ({ success: false; error: string })

export async function invoke<T extends object>(channel: string, ...args: unknown[]) {
  return (await window.electron.invoke(channel, ...args)) as AppResponse<T>
}
