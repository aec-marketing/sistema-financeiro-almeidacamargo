import { useState, useEffect } from 'react'
import { detectarDuplicatas } from '../utils/duplicatas'

// Hook personalizado para usar no ClientesPage.tsx
export function useDuplicatasStatus() {
  const [status, setStatus] = useState<{
    temDuplicatas: boolean
    altaConfianca: number
    mediaConfianca: number
    carregando: boolean
  }>({
    temDuplicatas: false,
    altaConfianca: 0,
    mediaConfianca: 0,
    carregando: true
  })

  useEffect(() => {
    const verificarDuplicatas = async () => {
      try {
        const grupos = await detectarDuplicatas()
        const alta = grupos.filter(g => g.confianca >= 85).length
        const media = grupos.filter(g => g.confianca >= 70 && g.confianca < 85).length
        
        setStatus({
          temDuplicatas: grupos.length > 0,
          altaConfianca: alta,
          mediaConfianca: media,
          carregando: false
        })
      } catch (error) {
        console.error('Erro ao verificar duplicatas:', error)
        setStatus(prev => ({ ...prev, carregando: false }))
      }
    }

    verificarDuplicatas()
  }, [])

  return status
}