// src/components/Dashboard/DashboardWithCharts.tsx
import React from 'react'
import { useUserAccess } from '../../hooks/useUserAccess'
import DashboardAdmin from './DashboardAdmin'
import VendedorDashboard from './VendedorDashboard'

const DashboardWithCharts: React.FC = () => {
  const { isAdmin, isVendedor, loading } = useUserAccess()

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>
  }

  if (isAdmin) {
    return <DashboardAdmin />
  }
  
  if (isVendedor) {
    return <VendedorDashboard />
  }

  return <div className="p-8">Tipo de usuário não reconhecido</div>
}

export default DashboardWithCharts