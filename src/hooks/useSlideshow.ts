// =====================================================
// HOOK PARA CONTROLE DE SLIDESHOW
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SlideshowState } from '../types/observador';

/**
 * Hook para gerenciar slideshow automático com controles manuais
 * @param totalSlides - Número total de slides
 * @param intervalo - Tempo em ms entre slides (padrão: 30000 = 30s)
 * @returns Estado e controles do slideshow
 */
export function useSlideshow(
  totalSlides: number,
  intervalo: number = 30000
): SlideshowState & {
  proximoSlide: () => void;
  slideAnterior: () => void;
  irParaSlide: (index: number) => void;
  pausar: () => void;
  retomar: () => void;
  resetarTimer: () => void;
} {
  const [slideAtual, setSlideAtual] = useState(0);
  const [isPausado, setIsPausado] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(intervalo);
  const [ultimaTransicao, setUltimaTransicao] = useState<Date | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Função para ir ao próximo slide
  const proximoSlide = useCallback(() => {
    setSlideAtual((atual) => (atual + 1) % totalSlides);
    setUltimaTransicao(new Date());
    setTempoRestante(intervalo);
  }, [totalSlides, intervalo]);

  // Função para ir ao slide anterior
  const slideAnterior = useCallback(() => {
    setSlideAtual((atual) => (atual - 1 + totalSlides) % totalSlides);
    setUltimaTransicao(new Date());
    setTempoRestante(intervalo);
  }, [totalSlides, intervalo]);

  // Função para ir a um slide específico
  const irParaSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setSlideAtual(index);
      setUltimaTransicao(new Date());
      setTempoRestante(intervalo);
    }
  }, [totalSlides, intervalo]);

  // Função para pausar
  const pausar = useCallback(() => {
    setIsPausado(true);
  }, []);

  // Função para retomar
  const retomar = useCallback(() => {
    setIsPausado(false);
    setTempoRestante(intervalo);
  }, [intervalo]);

  // Função para resetar timer
  const resetarTimer = useCallback(() => {
    setTempoRestante(intervalo);
  }, [intervalo]);

  // Timer principal - avança slides automaticamente
  useEffect(() => {
    if (isPausado || totalSlides <= 1) return;

    timerRef.current = setInterval(() => {
      proximoSlide();
    }, intervalo);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPausado, intervalo, proximoSlide, totalSlides]);

  // Countdown visual - atualiza tempo restante a cada segundo
  useEffect(() => {
    if (isPausado) return;

    countdownRef.current = setInterval(() => {
      setTempoRestante((tempo) => {
        const novoTempo = tempo - 1000;
        return novoTempo <= 0 ? intervalo : novoTempo;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isPausado, intervalo]);

  return {
    slideAtual,
    isPausado,
    tempoRestante,
    ultimaTransicao,
    proximoSlide,
    slideAnterior,
    irParaSlide,
    pausar,
    retomar,
    resetarTimer,
  };
}