/**
 * Insert text at the current cursor position in a textarea/input element.
 * Replaces any selected text with the inserted content and
 * repositions the cursor after the inserted text.
 */
export function insertTextAtCursor(
  element: HTMLTextAreaElement | HTMLInputElement,
  text: string
): void {
  const start = element.selectionStart;
  const end = element.selectionEnd;

  // Inputs without a text cursor (e.g. type="number") report null; inserting there would wipe their value
  if (start === null || end === null) return;

  const newValue = element.value.substring(0, start) + text + element.value.substring(end);

  // Set the value through the prototype setter, not `element.value = ...`:
  // React records values assigned on the element itself, and onChange only
  // fires when the DOM value differs from the value React last recorded.
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, newValue);
  }

  // Trigger React synthetic event so React state picks up the change
  element.dispatchEvent(new Event('input', { bubbles: true }));

  // Reposition cursor after inserted text
  const newPos = start + text.length;
  element.focus();
  element.setSelectionRange(newPos, newPos);
}
