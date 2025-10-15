// Sistema de cache para dados do relatório
// Evita consultas repetidas ao banco de dados

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // em milissegundos
  userId?: string; // Para cache por usuário
}

interface CacheConfig {
  expiresIn?: number; // Tempo de expiração padrão (em minutos)
  userId?: string; // ID do usuário para cache específico
}

const DEFAULT_EXPIRATION = 30; // 30 minutos por padrão

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Gera uma chave única para o cache considerando userId
   */
  private generateKey(key: string, userId?: string): string {
    return userId ? `cache_${key}_${userId}` : `cache_${key}`;
  }

  /**
   * Salva dados no cache com verificação de espaço
   */
  set<T>(key: string, data: T, config: CacheConfig = {}): void {
    try {
      const expiresIn = (config.expiresIn || DEFAULT_EXPIRATION) * 60 * 1000; // Converte para ms

      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
        userId: config.userId
      };

      const cacheKey = this.generateKey(key, config.userId);
      const serializedData = JSON.stringify(cacheItem);
      const dataSize = new Blob([serializedData]).size;
      const dataSizeKB = Math.round(dataSize / 1024);

      // Verifica se o dado é muito grande (> 3MB)
      const MAX_SIZE_MB = 3;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

      if (dataSize > MAX_SIZE_BYTES) {
        console.warn(`⚠️ Dados muito grandes para cache: ${cacheKey} (${dataSizeKB} KB)`);
        console.warn(`💡 Considere usar apenas índices ou dados resumidos para cache`);
        return;
      }

      // Tenta salvar
      try {
        localStorage.setItem(cacheKey, serializedData);
        console.log(`✅ Cache salvo: ${cacheKey} (${dataSizeKB} KB, expira em ${config.expiresIn || DEFAULT_EXPIRATION} min)`);
      } catch (quotaError) {
        // Se exceder quota, tenta limpar e salvar novamente
        console.warn('⚠️ Quota excedida, limpando caches antigos...');
        this.clearExpiredCaches();

        // Tenta remover o maior cache não essencial
        const caches = this.getInfo();
        if (caches.length > 0) {
          const biggestCache = caches.sort((a, b) => b.size - a.size)[0];
          console.warn(`🗑️ Removendo cache maior: ${biggestCache.key} (${Math.round(biggestCache.size / 1024)} KB)`);
          localStorage.removeItem(biggestCache.key);
        }

        // Tenta salvar novamente
        try {
          localStorage.setItem(cacheKey, serializedData);
          console.log(`✅ Cache salvo após limpeza: ${cacheKey} (${dataSizeKB} KB)`);
        } catch (finalError) {
          console.error(`❌ Não foi possível salvar cache: ${cacheKey}`);
          console.error(`💡 Dados muito grandes (${dataSizeKB} KB). Cache desabilitado para esta chave.`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
    }
  }

  /**
   * Recupera dados do cache
   */
  get<T>(key: string, userId?: string): T | null {
    try {
      const cacheKey = this.generateKey(key, userId);
      const item = localStorage.getItem(cacheKey);

      if (!item) {
        console.log(`ℹ️ Cache não encontrado: ${cacheKey}`);
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();
      const age = now - cacheItem.timestamp;

      // Verifica se o cache expirou
      if (age > cacheItem.expiresIn) {
        console.log(`⏰ Cache expirado: ${cacheKey} (idade: ${Math.round(age / 1000 / 60)} minutos)`);
        this.remove(key, userId);
        return null;
      }

      const remainingTime = Math.round((cacheItem.expiresIn - age) / 1000 / 60);
      console.log(`✅ Cache recuperado: ${cacheKey} (expira em ${remainingTime} minutos)`);

      return cacheItem.data;
    } catch (error) {
      console.error('❌ Erro ao recuperar cache:', error);
      return null;
    }
  }

  /**
   * Remove um item específico do cache
   */
  remove(key: string, userId?: string): void {
    try {
      const cacheKey = this.generateKey(key, userId);
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Cache removido: ${cacheKey}`);
    } catch (error) {
      console.error('❌ Erro ao remover cache:', error);
    }
  }

  /**
   * Limpa todos os caches
   */
  clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      cacheKeys.forEach(key => localStorage.removeItem(key));

      console.log(`🗑️ ${cacheKeys.length} caches removidos`);
    } catch (error) {
      console.error('❌ Erro ao limpar todos os caches:', error);
    }
  }

  /**
   * Limpa apenas caches expirados
   */
  clearExpiredCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      let removed = 0;

      cacheKeys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const cacheItem: CacheItem<unknown> = JSON.parse(item);
            const age = Date.now() - cacheItem.timestamp;

            if (age > cacheItem.expiresIn) {
              localStorage.removeItem(key);
              removed++;
            }
          }
        } catch (e) {
          // Se houver erro ao parsear, remove o item
          localStorage.removeItem(key);
          removed++;
        }
      });

      if (removed > 0) {
        console.log(`🗑️ ${removed} caches expirados removidos`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar caches expirados:', error);
    }
  }

  /**
   * Retorna informações sobre os caches armazenados
   */
  getInfo(): { key: string; age: number; size: number; expiresIn: number }[] {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      return cacheKeys.map(key => {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const cacheItem: CacheItem<unknown> = JSON.parse(item);
        const age = Date.now() - cacheItem.timestamp;
        const size = new Blob([item]).size;

        return {
          key,
          age: Math.round(age / 1000 / 60), // em minutos
          size,
          expiresIn: Math.round((cacheItem.expiresIn - age) / 1000 / 60) // em minutos
        };
      }).filter(Boolean) as { key: string; age: number; size: number; expiresIn: number }[];
    } catch (error) {
      console.error('❌ Erro ao obter info dos caches:', error);
      return [];
    }
  }

  /**
   * Retorna o tamanho total ocupado pelo cache (em KB)
   */
  getTotalSize(): number {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      let totalSize = 0;
      cacheKeys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += new Blob([item]).size;
        }
      });

      return Math.round(totalSize / 1024); // Retorna em KB
    } catch (error) {
      console.error('❌ Erro ao calcular tamanho do cache:', error);
      return 0;
    }
  }
}

// Exporta instância singleton
export const cache = CacheManager.getInstance();

// Chaves de cache padronizadas
export const CACHE_KEYS = {
  CLIENTES: 'relatorio_clientes',
  ITENS: 'relatorio_itens',
  VENDAS: 'relatorio_vendas',
  VENDAS_ENRIQUECIDAS: 'relatorio_vendas_enriquecidas'
};

// Tempos de expiração (em minutos)
export const CACHE_EXPIRATION = {
  CLIENTES: 60,        // 1 hora (dados mudam pouco)
  ITENS: 60,           // 1 hora (dados mudam pouco)
  VENDAS: 30,          // 30 minutos (dados mudam mais)
  VENDAS_ENRIQUECIDAS: 30  // 30 minutos
};
