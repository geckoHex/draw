/**
 * Creates an RFC 4122 version 4 identifier in every browser context.
 *
 * `crypto.randomUUID()` is restricted to secure contexts, so it is not
 * available when GeckoDraw is opened over plain HTTP from another LAN device.
 * `getRandomValues()` is available in those contexts and gives us the same
 * cryptographically strong random bytes.
 */
export function createClientId(): string {
  const browserCrypto = globalThis.crypto

  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  browserCrypto.getRandomValues(bytes)

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`
}
