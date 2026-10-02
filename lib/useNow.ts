"use client";

import { useEffect, useState } from "react";

/**
 * Retorna o timestamp atual e re-renderiza a cada `intervalMs`.
 * Usado para cooldowns, que dependem do relogio e nao de mudancas de estado.
 */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, intervalMs);

    // Ao voltar para a aba, atualiza na hora em vez de esperar o proximo ciclo.
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);

  return now;
}
