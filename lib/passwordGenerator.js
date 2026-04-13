/**
 * Generate a random alphanumeric password
 * @param {number} length - Password length (default: 8)
 * @returns {string} Random password
 */
export function generatePassword(length = 8) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
