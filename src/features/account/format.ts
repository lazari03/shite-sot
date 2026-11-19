/** Show a stored E.164 number in a friendly local format for editing. */
export function formatPhoneForInput(e164: string | null): string {
  if (!e164) return "";
  if (e164.startsWith("355")) return "0" + e164.slice(3);
  return "+" + e164;
}
