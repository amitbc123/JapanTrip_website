/** Copies text, falling back to a hidden textarea + execCommand where the
 *  async Clipboard API is missing or refuses (e.g. no recent user tap). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    let ok = false
    try {
      ok = document.execCommand("copy")
    } catch {
      ok = false
    }
    textarea.remove()
    return ok
  }
}

/** Copies text that isn't known yet, while still inside the tap that asked
 *  for it. Safari only allows clipboard writes during a user gesture, so the
 *  write must start synchronously in the tap handler with a promise for the
 *  content (ClipboardItem accepts one); browsers without that support fall
 *  back to an ordinary copy once the text arrives. Resolves to whether the
 *  copy succeeded. */
export function copyTextWhenReady(textPromise: Promise<string>): Promise<boolean> {
  const canWritePromise =
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function" &&
    (typeof ClipboardItem.supports !== "function" || ClipboardItem.supports("text/plain"))
  if (!canWritePromise) return textPromise.then(copyText, () => false)
  const item = new ClipboardItem({
    "text/plain": textPromise.then((text) => new Blob([text], { type: "text/plain" })),
  })
  return navigator.clipboard.write([item]).then(
    () => true,
    // A rejected write may just mean no promise support — retry plainly,
    // unless the text itself never arrived.
    () => textPromise.then(copyText, () => false)
  )
}
