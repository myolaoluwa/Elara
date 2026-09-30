export type EmailTemplate = {
  subject: string;
  textContent: string;
  htmlContent: string;
  tag: string;
};

type OTPPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

const otpCopy: Record<OTPPurpose, { label: string; title: string; intro: string; subject: string; tag: string }> = {
  "email-verification": {
    label: "Account verification",
    title: "Verify your email address",
    intro: "Enter this code in Elara to finish creating your private workspace.",
    subject: "Verify your Elara email",
    tag: "email-verification",
  },
  "sign-in": {
    label: "Security check",
    title: "Confirm this new device",
    intro: "A sign-in to Elara needs verification before this device can access your workspace.",
    subject: "Confirm your Elara sign-in",
    tag: "new-device-sign-in",
  },
  "forget-password": {
    label: "Password recovery",
    title: "Reset your password",
    intro: "Enter this code in Elara to continue resetting your password.",
    subject: "Reset your Elara password",
    tag: "password-reset",
  },
  "change-email": {
    label: "Account security",
    title: "Confirm your email change",
    intro: "Enter this code in Elara to approve the change to your account email.",
    subject: "Confirm your Elara email change",
    tag: "email-change",
  },
};

export function authOTPEmail(otp: string, purpose: OTPPurpose): EmailTemplate {
  const copy = otpCopy[purpose];
  const safeOtp = escapeHtml(otp);
  return {
    subject: copy.subject,
    tag: copy.tag,
    textContent: `${copy.title}\n\n${copy.intro}\n\nYour verification code is ${otp}.\n\nThis code expires in five minutes and can only be used once. If you did not request this, do not share the code and you can safely ignore this email.`,
    htmlContent: emailLayout({
      label: copy.label,
      title: copy.title,
      intro: copy.intro,
      content: `<div style="margin:28px 0;padding:22px 18px;text-align:center;background:#e8f0ec;border:1px solid #d7e5de;border-radius:12px"><div style="color:#153c31;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;line-height:1">${safeOtp}</div></div><p style="margin:0;color:#68736e;font-size:13px;line-height:1.65">This code expires in five minutes and can only be used once. Elara will never ask you to send this code by email or chat.</p>`,
    }),
  };
}

export function passwordResetEmail(name: string, url: string): EmailTemplate {
  const safeName = escapeHtml(name.trim() || "there");
  const safeUrl = escapeHtml(url);
  return {
    subject: "Reset your Elara password",
    tag: "password-reset",
    textContent: `Hi ${name.trim() || "there"},\n\nReset your Elara password using this secure link: ${url}\n\nThe link expires shortly. If you did not request this, you can safely ignore this email.`,
    htmlContent: emailLayout({
      label: "Password recovery",
      title: "Reset your password",
      intro: `Hi ${safeName}, use the secure link below to choose a new Elara password.`,
      content: `${actionButton("Reset password", safeUrl)}<p style="margin:24px 0 0;color:#68736e;font-size:13px;line-height:1.65">If the button does not work, copy and paste this address into your browser:</p><p style="margin:8px 0 0;overflow-wrap:anywhere;color:#1e5141;font-size:12px;line-height:1.6">${safeUrl}</p>`,
    }),
  };
}

export function workspaceInvitationEmail(inviterName: string, workspaceName: string, url: string): EmailTemplate {
  const safeInviter = escapeHtml(inviterName);
  const safeUrl = escapeHtml(url);
  return {
    subject: `You’re invited to ${workspaceName} on Elara`,
    tag: "workspace-invitation",
    textContent: `${inviterName} invited you to join ${workspaceName} on Elara.\n\nAccept the invitation: ${url}\n\nOnly accept if you recognize the sender and expected this invitation.`,
    htmlContent: emailLayout({
      label: "Workspace invitation",
      title: `Join ${workspaceName}`,
      intro: `${safeInviter} invited you to collaborate in a private Elara workspace.`,
      content: `${actionButton("Accept invitation", safeUrl)}<p style="margin:24px 0 0;color:#68736e;font-size:13px;line-height:1.65">Only accept this invitation if you recognize the sender and expected to join this workspace.</p>`,
    }),
  };
}

function actionButton(label: string, safeUrl: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td style="border-radius:9px;background:#1e5141"><a href="${safeUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

function emailLayout({ label, title, intro, content }: { label: string; title: string; intro: string; content: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:#f4f7f5;color:#17201d;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e8e4;border-radius:16px;box-shadow:0 12px 32px rgba(27,45,38,.06)"><tr><td style="padding:24px 30px;border-bottom:1px solid #edf1ef"><span style="display:inline-block;width:30px;height:30px;text-align:center;color:#ffffff;background:#1e5141;border-radius:8px;font:700 16px/30px Georgia,serif">E</span><span style="margin-left:10px;color:#153c31;font-size:13px;font-weight:700;letter-spacing:2px">ELARA</span></td></tr><tr><td style="padding:34px 30px 30px"><p style="margin:0 0 10px;color:#5e7f70;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">${escapeHtml(label)}</p><h1 style="margin:0 0 14px;color:#17201d;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;line-height:1.2">${escapeHtml(title)}</h1><p style="margin:0;color:#53605a;font-size:15px;line-height:1.65">${intro}</p>${content}</td></tr><tr><td style="padding:20px 30px;color:#7c8782;background:#fafcfb;border-top:1px solid #edf1ef;border-radius:0 0 16px 16px;font-size:11px;line-height:1.6">This automated security message was sent by Elara. Please do not reply with passwords or verification codes.</td></tr></table></td></tr></table></body></html>`;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}
