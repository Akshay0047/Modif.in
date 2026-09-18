const TAB_SPACES = "    ";

export function insertTabAtCursor(event) {
    const target = event.target;
    const isTextarea = target instanceof HTMLTextAreaElement;
    const isTextInput =
        target instanceof HTMLInputElement &&
        (target.type === "text" ||
            target.type === "search" ||
            target.type === "url" ||
            target.type === "email" ||
            target.type === "password" ||
            target.type === "");

    if (!isTextarea && !isTextInput) return false;
    if (target.readOnly || target.disabled) return false;

    event.preventDefault();

    const { selectionStart, selectionEnd, value } = target;
    const nextValue =
        value.slice(0, selectionStart) +
        TAB_SPACES +
        value.slice(selectionEnd);

    const prototype = isTextarea
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;
    valueSetter.call(target, nextValue);
    target.dispatchEvent(new Event("input", { bubbles: true }));

    const cursor = selectionStart + TAB_SPACES.length;
    target.setSelectionRange(cursor, cursor);

    return true;
}
