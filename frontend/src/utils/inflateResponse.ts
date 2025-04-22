import { inflate } from 'pako';

/**
 * Inflates a deflated string from a Response object.
 *
 * This function performs the following steps:
 * 1. Reads the binary compressed file from the Response object.
 * 2. Decompresses the binary data using the `pako.inflate` function.
 * 3. Converts the decompressed binary data back to a UTF-8 string.
 *
 * ### Usage
 *
 * ```typescript
 * import { inflateResponse } from '$utils';
 *
 * fetch('https://example.com/zlib-deflated-data')
 *   .then(inflateResonse)
 *   .then((text) => {
 *     // do something with the inflated text
 *   })
 * ```
 *
 * @param response - The Response object containing the compressed binary data.
 * @returns A promise that resolves to the decompressed UTF-8 string.
 */
export async function inflateResponse(response: Response) {
  const compressedBinary = new Uint8Array(await response.arrayBuffer());
  const decompressedBinary = inflate(compressedBinary);
  return new TextDecoder().decode(decompressedBinary);
}
