import { useEffect, useState } from 'react';

/**
 * Wysokość klawiatury ekranowej w pikselach (0 = klawiatura zamknięta).
 *
 * Na iPhone otwarcie klawiatury NIE zmniejsza `window.innerHeight` ani
 * kontenerów `position: fixed` — zmniejsza się wyłącznie
 * `window.visualViewport`. Modal przyklejony do dołu ekranu chowa się
 * więc za klawiaturą i pole e-mail jest niewidoczne. Różnica wysokości
 * daje nam wysokość klawiatury, którą modal wykorzystuje jako padding.
 *
 * @see https://developer.mozilla.org/docs/Web/API/Visual_Viewport_API
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    // Safari < 13 i przeglądarki bez Visual Viewport — klawiatury nie obsługujemy.
    if (!vv) return;

    const update = () => {
      // `offsetTop` to przesunięcie widoku przy przewijaniu — iOS potrafi
      // przewinąć stronę przy otwarciu klawiatury, więc je odejmujemy.
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(keyboard);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
