export async function generateHash(message: string, algorithm: AlgorithmIdentifier = 'SHA-1') {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await window.crypto.subtle.digest(algorithm, data);
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
