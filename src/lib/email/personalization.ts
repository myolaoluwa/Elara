const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PersonalizedEmail = {
  toEmail: string;
  toName: string;
  subject: string;
  bodyText: string;
  fromName: string;
};

export function personalizeEmail(input: PersonalizedEmail) {
  const toName = cleanHeader(input.toName) || "there";
  const firstName = toName.split(/\s+/)[0] || toName;
  const replacements: Record<string, string> = {
    "{{name}}": toName,
    "{{firstName}}": firstName,
    "{{first_name}}": firstName,
  };
  const interpolate = (value: string) => Object.entries(replacements).reduce((result, [key, replacement]) => result.split(key).join(replacement), value);
  let bodyText = stripEmDashes(interpolate(input.bodyText)).trim();
  if (!new RegExp(`^(hi|hello|dear)\\s+${escapeRegExp(firstName)}\\b`, "i").test(bodyText)) bodyText = `Hi ${firstName},\n\n${bodyText}`;
  if (!hasSignOff(bodyText, input.fromName)) bodyText = `${bodyText}\n\nBest,\n${cleanHeader(input.fromName)}`;
  return {
    toEmail: validateEmail(input.toEmail),
    toName,
    subject: stripEmDashes(interpolate(cleanHeader(input.subject))),
    bodyText,
    fromName: cleanHeader(input.fromName),
  };
}

export function stripEmDashes(value: string) {
  return value.replace(/\s*—\s*/g, ", ").replace(/,\s*,/g, ",");
}

export function validateEmail(value: string) {
  const clean = cleanHeader(value).toLowerCase();
  if (!EMAIL_PATTERN.test(clean)) throw new Error("A valid recipient email is required");
  return clean;
}

export function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function hasSignOff(body: string, name: string) {
  const tail = body.slice(-240);
  return /\b(best|regards|sincerely|thank you|thanks),?\s*$/im.test(tail) || tail.toLowerCase().includes(cleanHeader(name).toLowerCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
