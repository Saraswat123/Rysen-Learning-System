/**
 * pg-connection-string currently treats prefer/require/verify-ca as aliases
 * for verify-full. Make that behavior explicit so a future pg major version
 * cannot silently weaken certificate and hostname verification.
 */
export function getDatabaseUrl(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) return undefined

  try {
    const url = new URL(connectionString)
    const sslmode = url.searchParams.get('sslmode')
    if (sslmode && ['prefer', 'require', 'verify-ca'].includes(sslmode)) {
      url.searchParams.set('sslmode', 'verify-full')
    }
    return url.toString()
  } catch {
    // Preserve non-URL connection strings; pg will report any parse error.
    return connectionString
  }
}
