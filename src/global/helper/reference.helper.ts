import * as crypto from 'crypto';

export function generateReference(prefix: string = ''): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomInt(1000000, 9999999).toString();
  return `${prefix}${timestamp}${random}`;
}
