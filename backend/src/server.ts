import { inspect } from 'node:util'

type BuildApp = typeof import('./app.js').buildApp
type AppInstance = Awaited<ReturnType<BuildApp>>

function describeError(err: unknown) {
  if (err instanceof Error) {
    const meta: Record<string, unknown> = {}
    const nodeErr = err as NodeJS.ErrnoException & { cause?: unknown }

    if (nodeErr.code !== undefined) meta.code = nodeErr.code
    if (nodeErr.errno !== undefined) meta.errno = nodeErr.errno
    if (nodeErr.syscall !== undefined) meta.syscall = nodeErr.syscall
    if (nodeErr.cause !== undefined) meta.cause = nodeErr.cause

    return { error: err, meta: Object.keys(meta).length ? meta : undefined }
  }

  const preview = inspect(err, { depth: 6 })
  return {
    error: new Error(`Non-Error thrown: ${preview}`),
    meta: { thrownType: typeof err, thrownPreview: preview },
  }
}

async function main() {
  let app: AppInstance | undefined

  try {
    const { buildApp } = await import('./app.js')
    app = await buildApp()

    const port = Number(process.env.PORT ?? 3000)
    const host = process.env.HOST ?? '0.0.0.0'

    let closing = false
    const shutdown = async (reason: string, err?: unknown) => {
      if (closing) return
      closing = true

      if (app) {
        if (err) {
          const { error, meta } = describeError(err)
          app.log.fatal({ err: error, meta }, `fatal: ${reason}`)
        } else app.log.info({ reason }, 'Shutting down...')

        try {
          await app.close()
        } finally {
          process.exit(err ? 1 : 0)
        }
      } else {
        process.exit(1)
      }
    }
    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
    process.once('unhandledRejection', (reason) => void shutdown('unhandledRejection', reason))
    process.once('uncaughtException',  (error)  => void shutdown('uncaughtException', error))

    await app.listen({ port, host })
    console.log(`\x1b[32m[Active] Сервер успешно запущен и слушает: http://${host}:${port}\x1b[0m`)
    console.log(`\x1b[36m[Route] Проверить комнаты: http://localhost:${port}/api/rooms\x1b[0m`)
  } catch (err) {
    const { error, meta } = describeError(err)
    console.error('Failed to start application:', error)
    if (meta) console.error('Error details:', meta)
    process.exit(1)
  }
}

void main()