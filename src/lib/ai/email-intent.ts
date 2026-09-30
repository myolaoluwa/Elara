export function isEmailActionRequest(prompt: string) {
  return /\b(send|email|e-mail|draft|reply|schedule)\b/i.test(prompt) && /\b(send|draft|reply|schedule|write|compose)\b/i.test(prompt);
}
