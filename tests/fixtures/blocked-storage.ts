/**
 * Makes reading `window.localStorage` throw, as Firefox does with cookies
 * blocked and some WebViews do. Returns a function that restores it.
 */
export function blockLocalStorage(): () => void {
  const own = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  return () => {
    if (own) Object.defineProperty(window, "localStorage", own);
    else delete (window as { localStorage?: Storage }).localStorage;
  };
}
