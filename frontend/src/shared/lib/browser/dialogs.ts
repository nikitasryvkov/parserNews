export function confirmAction(message: string): boolean {
  return window.confirm(message);
}

export function promptText(message: string, defaultValue = ''): string | null {
  return window.prompt(message, defaultValue);
}
