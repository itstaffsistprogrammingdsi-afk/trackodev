import { useEffect, useState } from "react";

/**
 * Deteksi viewport kompak (HP/tablet sentuh) untuk browser biasa.
 *
 * Sebelumnya beberapa layar memakai `isMobileApp()` dari mobileConfig yang
 * HANYA bernilai true di aplikasi native (Capacitor), sehingga layout mobile
 * yang sudah rapi tidak pernah aktif saat dibuka lewat Chrome/Safari HP.
 * Hook ini melengkapinya tanpa mengubah perilaku aplikasi native.
 */
const COMPACT_QUERY = "(max-width: 767px), (pointer: coarse)";

function currentMatch(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;

  return window.matchMedia(COMPACT_QUERY).matches;
}

export function useIsCompactViewport(): boolean {
  const [matches, setMatches] = useState<boolean>(currentMatch);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(COMPACT_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);

    // Safari < 14 hanya punya addListener/removeListener.
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return matches;
}
