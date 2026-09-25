export function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

export function formatarMoeda(valor) {
  return numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function dataLocalISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function dataDeISO(dataISO) {
  const [ano, mes, dia] = String(dataISO).split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1, 0, 0, 0, 0);
}

export function intervaloPorTipo(tipo, dataInicial = "", dataFinal = "") {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let inicio = new Date(hoje);
  let fimInclusivo = new Date(hoje);

  if (tipo === "ontem") {
    inicio.setDate(inicio.getDate() - 1);
    fimInclusivo = new Date(inicio);
  } else if (tipo === "7" || tipo === "30") {
    inicio.setDate(inicio.getDate() - (Number(tipo) - 1));
  } else if (tipo === "personalizado") {
    if (!dataInicial || !dataFinal) {
      throw new Error("Selecione a data inicial e a data final.");
    }
    inicio = dataDeISO(dataInicial);
    fimInclusivo = dataDeISO(dataFinal);
    if (fimInclusivo < inicio) {
      throw new Error("A data final não pode ser anterior à data inicial.");
    }
  }

  const fimExclusivo = new Date(fimInclusivo);
  fimExclusivo.setDate(fimExclusivo.getDate() + 1);

  const duracaoDias = Math.max(
    1,
    Math.round((fimExclusivo.getTime() - inicio.getTime()) / 86400000),
  );

  return {
    inicio,
    fimInclusivo,
    fimExclusivo,
    inicioISO: inicio.toISOString(),
    fimISO: fimExclusivo.toISOString(),
    inicioData: dataLocalISO(inicio),
    fimData: dataLocalISO(fimInclusivo),
    duracaoDias,
  };
}

export function intervaloAnterior(intervalo) {
  const fimExclusivo = new Date(intervalo.inicio);
  const inicio = new Date(fimExclusivo);
  inicio.setDate(inicio.getDate() - intervalo.duracaoDias);
  const fimInclusivo = new Date(fimExclusivo);
  fimInclusivo.setDate(fimInclusivo.getDate() - 1);

  return {
    inicio,
    fimInclusivo,
    fimExclusivo,
    inicioISO: inicio.toISOString(),
    fimISO: fimExclusivo.toISOString(),
    inicioData: dataLocalISO(inicio),
    fimData: dataLocalISO(fimInclusivo),
    duracaoDias: intervalo.duracaoDias,
  };
}

export function custoItensVenda(venda) {
  return (venda?.itens_venda || []).reduce(
    (soma, item) => soma + numero(item.custo_unitario) * numero(item.quantidade),
    0,
  );
}

function obterDiaLocal(valorData) {
  return dataLocalISO(new Date(valorData));
}

export function resumirPeriodo(vendas = [], perdas = []) {
  const faturamento = vendas.reduce((soma, venda) => soma + numero(venda.total), 0);
  const dinheiro = vendas.reduce((soma, venda) => soma + numero(venda.dinheiro), 0);
  const cartao = vendas.reduce((soma, venda) => soma + numero(venda.cartao), 0);
  const pix = vendas.reduce((soma, venda) => soma + numero(venda.pix), 0);
  const custoVendido = vendas.reduce((soma, venda) => soma + custoItensVenda(venda), 0);
  const custoPerdas = perdas.reduce((soma, registro) => soma + numero(registro.custo_total), 0);
  const resultadoBruto = faturamento - custoVendido - custoPerdas;
  const quantidadeVendas = vendas.length;
  const ticketMedio = quantidadeVendas ? faturamento / quantidadeVendas : 0;
  const margemBruta = faturamento ? (resultadoBruto / faturamento) * 100 : 0;

  return {
    faturamento,
    dinheiro,
    cartao,
    pix,
    custoVendido,
    custoPerdas,
    resultadoBruto,
    quantidadeVendas,
    ticketMedio,
    margemBruta,
  };
}

export function agruparProdutos(vendas = []) {
  const mapa = new Map();

  vendas.forEach((venda) => {
    (venda.itens_venda || []).forEach((item) => {
      const chave = item.produto_id || `nome:${item.nome_produto || "Produto"}`;
      const atual = mapa.get(chave) || {
        produtoId: item.produto_id || null,
        nome: item.nome_produto || "Produto",
        quantidade: 0,
        faturamento: 0,
        custo: 0,
        lucro: 0,
      };
      const quantidade = numero(item.quantidade);
      const faturamento = numero(item.subtotal) || numero(item.preco_unitario) * quantidade;
      const custo = numero(item.custo_unitario) * quantidade;

      atual.quantidade += quantidade;
      atual.faturamento += faturamento;
      atual.custo += custo;
      atual.lucro += faturamento - custo;
      mapa.set(chave, atual);
    });
  });

  return [...mapa.values()];
}

export function resumirPorDia(vendas = [], perdas = []) {
  const mapa = new Map();

  const garantirDia = (dataISO) => {
    if (!mapa.has(dataISO)) {
      mapa.set(dataISO, {
        data: dataISO,
        vendas: 0,
        faturamento: 0,
        custoVendido: 0,
        custoPerdas: 0,
        resultado: 0,
      });
    }
    return mapa.get(dataISO);
  };

  vendas.forEach((venda) => {
    const dia = garantirDia(obterDiaLocal(venda.realizada_em));
    dia.vendas += 1;
    dia.faturamento += numero(venda.total);
    dia.custoVendido += custoItensVenda(venda);
  });

  perdas.forEach((registro) => {
    const dia = garantirDia(obterDiaLocal(registro.registrada_em));
    dia.custoPerdas += numero(registro.custo_total);
  });

  mapa.forEach((dia) => {
    dia.resultado = dia.faturamento - dia.custoVendido - dia.custoPerdas;
  });

  return [...mapa.values()].sort((a, b) => b.data.localeCompare(a.data));
}

export function serieFaturamento(vendas = [], intervalo) {
  if (!intervalo || intervalo.duracaoDias <= 1) {
    const pontos = Array.from({ length: 24 }, (_, hora) => ({
      chave: String(hora).padStart(2, "0"),
      rotulo: `${String(hora).padStart(2, "0")}h`,
      valor: 0,
    }));

    vendas.forEach((venda) => {
      const hora = new Date(venda.realizada_em).getHours();
      if (pontos[hora]) pontos[hora].valor += numero(venda.total);
    });

    return pontos;
  }

  const mapa = new Map();
  const cursor = new Date(intervalo.inicio);
  while (cursor < intervalo.fimExclusivo) {
    const chave = dataLocalISO(cursor);
    mapa.set(chave, {
      chave,
      rotulo: cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  vendas.forEach((venda) => {
    const chave = obterDiaLocal(venda.realizada_em);
    const ponto = mapa.get(chave);
    if (ponto) ponto.valor += numero(venda.total);
  });

  return [...mapa.values()];
}
