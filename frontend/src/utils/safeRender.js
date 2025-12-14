/**
 * Universal safe render helper to prevent React error #31
 * Safely renders any value, converting objects to readable strings
 */

export function safeRender(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return value;
}

/**
 * Safe render for display in JSX (returns string or React element)
 */
export function safeRenderJSX(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(item => safeRenderJSX(item)).join(", ");
  }
  if (typeof value === "object") {
    // Try to extract meaningful text first
    if (value.text) return safeRenderJSX(value.text);
    if (value.value) return safeRenderJSX(value.value);
    if (value.label) return safeRenderJSX(value.label);
    if (value.name) return safeRenderJSX(value.name);
    if (value.description) return safeRenderJSX(value.description);
    // Fallback to JSON
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
