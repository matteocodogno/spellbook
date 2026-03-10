export function legacyCopy(text: string, onSuccess: () => void): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    onSuccess();
  } catch {
    // clipboard not available — silently ignore
  }
  document.body.removeChild(ta);
}

export function copyText(text: string, onSuccess: () => void): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      legacyCopy(text, onSuccess);
    });
  } else {
    legacyCopy(text, onSuccess);
  }
}
