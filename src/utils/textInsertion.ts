/**
 * Insert text at the current cursor position in a textarea element.
 * Replaces any selected text with the inserted content and
 * repositions the cursor after the inserted text.
 */
export function insertTextAtCursor(
  textarea: HTMLTextAreaElement,
  text: string
): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;

  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);

  textarea.value = before + text + after;

  // Reposition cursor after inserted text
  const newPos = start + text.length;
  textarea.selectionStart = newPos;
  textarea.selectionEnd = newPos;

  // Trigger React synthetic event so React state picks up the change
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(textarea, textarea.value);
  }

  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}
