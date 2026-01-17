/**
 * 📞 PHONE NUMBER HELPER
 * 
 * Canonicalizes phone numbers to E.164 format for WhatsApp/SMS delivery.
 */

/**
 * Formats a phone number to E.164 (e.g., +447123456789)
 * 
 * @param phone - Raw phone number string
 * @param defaultCountryCode - Country code to prepend if missing (default: 44)
 * @returns Canonicalized phone number
 */
export function formatToE164(phone: string, defaultCountryCode: string = "44"): string {
  if (!phone) return "";

  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // If starts with +, it's already mostly canonical
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.substring(2);
  }

  // Handle UK specific: if starts with 07 or 02 and no +, add country code
  if (cleaned.startsWith("0")) {
    return "+" + defaultCountryCode + cleaned.substring(1);
  }

  // Default: prepend + and country code if missing
  if (!cleaned.startsWith("+")) {
    return "+" + defaultCountryCode + cleaned;
  }

  return cleaned;
}
