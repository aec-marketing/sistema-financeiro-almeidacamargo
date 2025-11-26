// src/hooks/useCachedData.ts
import { useState, useEffect, useRef } from 'react';
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // em milissegundos
}

interface DashboardCacheDB extends DBSchema {
  cache: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: CacheEntry<any>;
  };
}

const DB_NAME = 'dashboard-cache';
const STORE_NAME = 'cache';
const DB_VERSION = 1;

// Inicializar IndexedDB
async function getDB(): Promise<IDBPDatabase<DashboardCacheDB>> {
  return openDB<DashboardCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

// Hook de cache
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: { cacheTime?: number; enabled?: boolean } = {}
) {
  const { cacheTime = 5 * 60 * 1000, enabled = true } = options; // 5 minutos padrão

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Usar ref para armazenar a função e evitar re-renders infinitos
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const db = await getDB();

        // Tentar buscar do cache
        const cached = await db.get(STORE_NAME, key);

        const now = Date.now();
        const isCacheValid = cached && (now - cached.timestamp) < cached.expiresIn;

        if (isCacheValid) {
          console.log(`✅ [CACHE] Dados carregados do cache: ${key}`);
          setData(cached.data);
          setLoading(false);
          return;
        }

        // Cache expirado ou não existe - buscar do servidor
        console.log(`🔄 [CACHE] Buscando dados do servidor: ${key}`);
        const freshData = await fetchFnRef.current();

        // Salvar no cache
        await db.put(STORE_NAME, {
          data: freshData,
          timestamp: now,
          expiresIn: cacheTime
        }, key);

        console.log(`💾 [CACHE] Dados salvos no cache: ${key} (expira em ${cacheTime / 1000 / 60} min)`);

        setData(freshData);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, enabled, cacheTime, refetchTrigger]);

  // Função para invalidar cache manualmente e recarregar
  const invalidateCache = async () => {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
    console.log(`🗑️ [CACHE] Cache invalidado: ${key}`);
    // Disparar refetch incrementando o trigger
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, invalidateCache };
}