// src/utils/exportPDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type para incluir autoTable e outros métodos
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: {
      finalY: number;
    };
    getNumberOfPages(): number;
  }
}

// Interfaces para tipagem
interface Metricas {
  totalVendas: number;
  faturamentoTotal: number;
  ticketMedio: number;
  clientesUnicos: number;
  quantidadeTotal: number;
}

interface Filtro {
  id: number;
  tabela: string;
  campo: string;
  operador: string;
  valor: string;
  logica: string;
}

interface Venda {
  id: number;
  'Data de Emissao da NF': string;
  total: string;
  Quantidade: string;
  'Preço Unitário': string;
  MARCA: string;
  GRUPO: string;
  CIDADE: string;
  NomeCli: string;
  NomeRepr: string;
  'Descr. Produto'?: string;
}

interface ExportOptions {
  nomeRelatorio: string;
  filtros: Filtro[];
  metricas: Metricas;
  dadosFiltrados: Venda[];
  limitePaginacao?: number;
  graficos?: Array<{id: string, config: any}>;
  graficosCapturados?: Array<{imagem: string, titulo: string, aspectRatio: number}>; // NOVA linha
}

// Função para formatar moeda brasileira
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Função para converter valores brasileiros para número
const converterValor = (valor: string | number | null | undefined): number => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  
  const valorLimpo = valor.toString()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(valorLimpo) || 0;
};

// Função para obter nome amigável das tabelas
const getNomeTabela = (tabela: string): string => {
  switch (tabela) {
    case 'clientes': return 'Clientes';
    case 'itens': return 'Produtos';
    case 'vendas': return 'Vendas';
    default: return tabela;
  }
};

// Função para obter label do campo
const getFieldLabel = (tabela: string, campo: string): string => {
  const TIPOS_FILTRO: Record<string, Record<string, string>> = {
    clientes: {
      "Nome": "Nome do Cliente",
      "Município": "Cidade",
      "Sigla Estado": "Estado",
      "CNPJ": "CNPJ"
    },
    itens: {
      "Descr. Marca Produto": "Marca",
      "Descr. Grupo Produto": "Categoria",
      "Desc. Subgrupo de Produto": "Subcategoria",
      "Cód. Referência": "Cód. Referência",
      "Cód. do Produto": "Código do Produto",
      "Descr. Produto": "Descrição do Produto"
    },
    vendas: {
      "Data de Emissao da NF": "Data da Venda",
      "total": "Valor Total",
      "Quantidade": "Quantidade",
      "Preço Unitário": "Preço Unitário",
      "MARCA": "Marca",
      "GRUPO": "Categoria",
      "CIDADE": "Cidade",
      "NomeCli": "Cliente",
      "NomeRepr": "Vendedor"
    }
  };

  return TIPOS_FILTRO[tabela]?.[campo] || campo;
};


// Função para capturar gráficos como imagem

// Função principal para gerar PDF
export const gerarRelatorioPDF = async (options: ExportOptions): Promise<void> => {
const {
  nomeRelatorio,
  filtros,
  metricas,
  dadosFiltrados,
  limitePaginacao = 1000,
  graficosCapturados // NOVA linha
} = options;

  try {
    // Criar instância do PDF
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let yPosition = 60;

    // 1. HEADER DA EMPRESA
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ALMEIDA&CAMARGO', 60, yPosition);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Automação e Segurança Industrial - Sorocaba/SP', 60, yPosition + 20);
    
    // Data de geração
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR');
    doc.text(`Relatório gerado em: ${dataFormatada}`, pageWidth - 200, yPosition);
    
    yPosition += 50;

    // 2. TÍTULO DO RELATÓRIO
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titulo = nomeRelatorio || 'Relatório de Vendas Personalizado';
    doc.text(titulo, 60, yPosition);
    yPosition += 30;

    // 3. MÉTRICAS PRINCIPAIS
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO EXECUTIVO', 60, yPosition);
    yPosition += 25;

    // Grid de métricas
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const metricsData = [
      ['Vendas Encontradas', metricas.totalVendas.toLocaleString('pt-BR')],
      ['Faturamento Total', formatarMoeda(metricas.faturamentoTotal)],
      ['Ticket Médio', formatarMoeda(metricas.ticketMedio)],
      ['Clientes Únicos', metricas.clientesUnicos.toLocaleString('pt-BR')],
      ['Quantidade Total', metricas.quantidadeTotal.toLocaleString('pt-BR')]
    ];

    // Usar autoTable como função externa
    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: metricsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 60, right: 60 },
      tableWidth: 'auto',
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      }
    });

    yPosition = doc.lastAutoTable.finalY + 30;

    // 4. FILTROS APLICADOS
    if (filtros.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('FILTROS APLICADOS', 60, yPosition);
      yPosition += 20;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      filtros.forEach((filtro, index) => {
        const filtroTexto = `${index + 1}. ${getNomeTabela(filtro.tabela)} → ${getFieldLabel(filtro.tabela, filtro.campo)} = "${filtro.valor}"`;
        
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 60;
        }
        
        doc.text(filtroTexto, 80, yPosition);
        yPosition += 15;
      });

      yPosition += 20;
    }


if (graficosCapturados && graficosCapturados.length > 0) {
  console.log(`Adicionando ${graficosCapturados.length} gráficos pré-capturados ao PDF`);

  // Nova página para gráficos se necessário
  if (yPosition > pageHeight - 400) {
    doc.addPage();
    yPosition = 60;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('VISUALIZAÇÕES GRÁFICAS', 60, yPosition);
  yPosition += 30;

  for (let i = 0; i < graficosCapturados.length; i++) {
    const graficoCapturado = graficosCapturados[i];

    // Se não há espaço suficiente, criar nova página
    if (yPosition > pageHeight - 350) {
      doc.addPage();
      yPosition = 60;
    }

    // Título do gráfico
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(graficoCapturado.titulo, 60, yPosition);
    yPosition += 25;

    // Calcular dimensões proporcionais
    const maxWidth = pageWidth - 120;
    const maxHeight = 250;

    let finalWidth = maxWidth;
    let finalHeight = finalWidth / graficoCapturado.aspectRatio;

    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * graficoCapturado.aspectRatio;
    }

    const xPosition = (pageWidth - finalWidth) / 2;

    try {
      doc.addImage(graficoCapturado.imagem, 'PNG', xPosition, yPosition, finalWidth, finalHeight);
      yPosition += finalHeight + 30;
      console.log(`Gráfico ${i + 1} adicionado ao PDF com sucesso`);
    } catch (error) {
      console.error('Erro ao adicionar imagem do gráfico:', error);
      yPosition += 20;
    }
  }

  yPosition += 20;
} else {
  console.log('Nenhum gráfico pré-capturado disponível');
}

    // 5. TABELA DE DADOS
    if (yPosition > pageHeight - 200) {
      doc.addPage();
      yPosition = 60;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO DAS VENDAS', 60, yPosition);
    yPosition += 10;

    if (dadosFiltrados.length > limitePaginacao) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Exibindo primeiros ${limitePaginacao} registros de ${dadosFiltrados.length} encontrados`, 60, yPosition + 15);
      yPosition += 10;
    }

    // Preparar dados da tabela
    const dadosTabela = dadosFiltrados
      .slice(0, limitePaginacao)
      .map(venda => [
        venda['Data de Emissao da NF'] || '',
        (venda.NomeCli || '').substring(0, 25) + (venda.NomeCli && venda.NomeCli.length > 25 ? '...' : ''),
        (venda['Descr. Produto'] || '').substring(0, 30) + (venda['Descr. Produto'] && venda['Descr. Produto'].length > 30 ? '...' : ''),
        venda.MARCA || '',
        venda.CIDADE || '',
        venda.Quantidade || '',
        formatarMoeda(converterValor(venda["Preço Unitário"]) * parseInt(venda.Quantidade || '1')),
        (venda.NomeRepr || '').substring(0, 15) + (venda.NomeRepr && venda.NomeRepr.length > 15 ? '...' : '')
      ]);

    autoTable(doc, {
      startY: yPosition + 25,
      head: [['Data', 'Cliente', 'Produto', 'Marca', 'Cidade', 'Qtd', 'Valor Total', 'Vendedor']],
      body: dadosTabela,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { 
        fontSize: 8 
      },
      columnStyles: {
        0: { cellWidth: 70 },  // Data
        1: { cellWidth: 120 }, // Cliente
        2: { cellWidth: 140 }, // Produto
        3: { cellWidth: 80 },  // Marca
        4: { cellWidth: 80 },  // Cidade
        5: { cellWidth: 40, halign: 'center' },  // Qtd
        6: { cellWidth: 80, halign: 'right' },   // Valor
        7: { cellWidth: 80 }   // Vendedor
      },
      margin: { left: 60, right: 60 },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    // 6. FOOTER
    const totalPages = doc.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer da empresa
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Almeida&Camargo - Automação e Segurança Industrial', 60, pageHeight - 40);
      doc.text('www.almeidaecamargo.com.br - contato@almeidaecamargo.com.br', 60, pageHeight - 25);
      
      // Numeração de páginas
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 100, pageHeight - 25);
    }

    // 7. SALVAR ARQUIVO
    const nomeArquivo = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${agora.getFullYear()}_${(agora.getMonth() + 1).toString().padStart(2, '0')}_${agora.getDate().toString().padStart(2, '0')}.pdf`;
    
    doc.save(nomeArquivo);
    
    console.log('PDF gerado com sucesso:', nomeArquivo);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Falha na geração do PDF. Verifique os dados e tente novamente.');
  }
};