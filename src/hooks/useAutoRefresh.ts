// =====================================================
// HOOK PARA AUTO-REFRESH DE DADOS
// =====================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar atualização automática de dados
 * @param intervalo - Tempo em ms entre atualizações (padrão: 1800000 = 30min)
 * @returns Estado e controles de atualização
 */
export function useAutoRefresh(intervalo: number = 1800000) {
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const [proximaAtualizacao, setProximaAtualizacao] = useState<Date>(
    new Date(Date.now() + intervalo)
  );
  const [contadorRefresh, setContadorRefresh] = useState(0);

  // Função para forçar atualização manual
  const forcarAtualizacao = useCallback(() => {
    setUltimaAtualizacao(new Date());
    setProximaAtualizacao(new Date(Date.now() + intervalo));
    setContadorRefresh((prev) => prev + 1);
  }, [intervalo]);

  // Timer de atualização automática
  useEffect(() => {
    const timer = setInterval(() => {
      forcarAtualizacao();
    }, intervalo);

    return () => clearInterval(timer);
  }, [intervalo, forcarAtualizacao]);

  // Atualizar próxima atualização a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setProximaAtualizacao(
        new Date(ultimaAtualizacao.getTime() + intervalo)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [ultimaAtualizacao, intervalo]);

  // Calcular tempo restante até próxima atualização
  const tempoRestante = Math.max(
    0,
    proximaAtualizacao.getTime() - Date.now()
  );

  // Calcular minutos restantes
  const minutosRestantes = Math.floor(tempoRestante / 60000);

  return {
    ultimaAtualizacao,
    proximaAtualizacao,
    tempoRestante,
    minutosRestantes,
    contadorRefresh, // Usar como dependency em queries
    forcarAtualizacao,
  };
}