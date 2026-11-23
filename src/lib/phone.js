// Malawi mobile numbers, stored as 265XXXXXXXXX (digits only, no plus or spaces).
// Accepts 0991234567, 991234567, +265 991 234 567, 265-991-234-567.
export function normaliseMalawiPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00265')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `265${digits.slice(1)}`;
  else if (/^(88|89|98|99)/.test(digits)) digits = `265${digits}`;
  return /^265(88|89|98|99)\d{7}$/.test(digits) ? digits : null;
}
