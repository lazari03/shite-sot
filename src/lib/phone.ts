/** Normalise an Albanian/Kosovar/international number to E.164 digits (no +). Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "355" + d.slice(1); // local Albanian format 06x...
  if (!/^\d{8,15}$/.test(d)) return null;
  return d;
}

export function whatsappLink(phoneE164Digits: string, message: string): string {
  return `https://wa.me/${phoneE164Digits}?text=${encodeURIComponent(message)}`;
}
