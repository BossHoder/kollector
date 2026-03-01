/**
 * coerceBool — Safe boolean coercion for React Native props.
 *
 * React Native Android Fabric crashes with
 *   "java.lang.String cannot be cast to java.lang.Boolean"
 * when a native‑boolean prop (visible, disabled, refreshing, …)
 * receives a string like "false" or "0".
 *
 * Boolean("false") === true  ← WRONG, so never use Boolean(x).
 *
 * This helper normalises any upstream value (route.params, storage,
 * API response, env var) into a real JS boolean before it reaches
 * the native view manager.
 *
 * @param {*}       v            — value to coerce
 * @param {boolean} defaultValue — fallback when v is null / undefined / unrecognised
 * @returns {boolean}
 */
export function coerceBool(v, defaultValue = false) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0' || s === '') return false;
  }
  return defaultValue;
}

/**
 * DEV-only runtime guard.
 * Logs a console.warn when a value that will be passed to a native
 * boolean prop is not actually a boolean.
 *
 * Usage (wrap every prop right before the JSX):
 *   assertBool('Modal.visible', visible);
 *
 * @param {string} label — "Component.prop" for the warning message
 * @param {*}      value — the value about to be passed
 */
export function assertBool(label, value) {
  if (__DEV__ && typeof value !== 'boolean') {
    console.warn(
      `[coerceBool] ${label} received non-boolean:`,
      JSON.stringify(value),
      `(${typeof value})`,
    );
  }
}

export default coerceBool;
