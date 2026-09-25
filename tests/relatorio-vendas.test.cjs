const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.TZ = 'America/Fortaleza';
const raiz = path.resolve(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');
const semModulos = (codigo) => codigo.replace(/^import[\s\S]*?from "[^\"]+";\n/gm, '').replaceAll('export function', 'function');

function ambiente(vendas = [], tipo = 'vendas', registros = []) {
  const ids = new Map();
  const eventos = new Map();
  const classes = new Set();
  const dias = [{ open: false }, { open: true }];
  const elemento = (id) => {
    if (!ids.has(id)) ids.set(id, { value: '', hidden: false, checked: false, textContent: '', addEventListener(nome, fn) { this[nome] = fn; } });
    return ids.get(id);
  };
  const window = { location: { search: `?tipo=${tipo}&inicio=2026-09-01&fim=2026-09-30` }, addEventListener: (nome, fn) => eventos.set(nome, fn), print() {} };
  const document = { getElementById: elemento, querySelectorAll: () => dias, body: { classList: { toggle(nome, ativo) { if (ativo) classes.add(nome); else classes.delete(nome); }, remove(nome) { classes.delete(nome); } } } };
  const contexto = vm.createContext({ URLSearchParams, window, document, console, listarVendasPeriodo: async () => vendas, listarPerdasPeriodo: async () => registros });
  for (const arquivo of ['js/relatorios-dados.js', 'js/relatorio-vendas-organizacao.js', 'js/relatorio-gerado.js']) {
    vm.runInContext(semModulos(ler(arquivo)).replace('await carregar();', ''), contexto);
  }
  return { executar: (codigo) => vm.runInContext(codigo, contexto), elemento, eventos, classes, dias, window };
}

test('períodos diário, semanal, mensal, ano bissexto e personalizado', () => {
  const a = ambiente();
  const casos = [
    ['diario', '2026-09-25', '2026-09-25', '2026-09-25', '2026-09-25'],
    ['semanal', '2026-10-01', '', '2026-09-28', '2026-10-04'],
    ['semanal', '2026-10-04', '', '2026-09-28', '2026-10-04'],
    ['mensal', '2026-09-25', '', '2026-09-01', '2026-09-30'],
    ['mensal', '2024-02-15', '', '2024-02-01', '2024-02-29'],
    ['mensal', '2026-12-31', '', '2026-12-01', '2026-12-31'],
    ['personalizado', '2026-08-15', '2026-09-25', '2026-08-15', '2026-09-25'],
  ];
  for (const [modo, data, fim, esperadoInicio, esperadoFim] of casos) {
    const resultado = a.executar(`periodoDeVendas(${JSON.stringify(modo)},${JSON.stringify(data)},${JSON.stringify(fim)})`);
    assert.equal(resultado.inicioData, esperadoInicio);
    assert.equal(resultado.fimData, esperadoFim);
  }
  assert.throws(() => a.executar('periodoDeVendas("diario", "2026-02-30")'));
  assert.throws(() => a.executar('periodoDeVendas("personalizado", "2026-09-25", "2026-09-01")'));
});

const vendas = [
  { realizada_em: '2026-09-26T01:00:00Z', total: 20, pix: 20, itens_venda: [{ produto_id: 'coxinha', nome_produto: 'Coxinha', quantidade: 2, subtotal: 20, custo_unitario: 3 }] },
  { realizada_em: '2026-09-25T16:00:00Z', total: 30, dinheiro: 30, itens_venda: [{ produto_id: 'coxinha', nome_produto: 'Coxinha', quantidade: 3, subtotal: 30, custo_unitario: 4 }] },
  { realizada_em: '2026-09-24T16:00:00Z', total: 25, cartao: 25, itens_venda: [{ produto_id: 'pao', nome_produto: 'Pão carioca', quantidade: 50, subtotal: 25, custo_unitario: 0.35 }] },
];

test('soma cada produto uma vez e separa as vendas pela data local', async () => {
  const a = ambiente(vendas);
  const html = await a.executar('renderVendas({})');
  assert.equal((html.match(/class="produto-resumo"/g) || []).length, 2);
  assert.match(html, /Quantidade: <b>5<\/b>/);
  assert.match(html, /Quantidade: <b>50<\/b>/);
  assert.match(html, /50,00/);
  assert.match(html, /18,00/);
  assert.match(html, /32,00/);
  assert.match(html, /75,00/);
  assert.equal((html.match(/class="resumo-item"/g) || []).length, 8);
  assert.equal((html.match(/<details class="vendas-dia">/g) || []).length, 2);
  assert.equal((html.match(/data-rotulo="Data \/ hora"/g) || []).length, 3);
  assert.ok(html.indexOf('25/09/2026') < html.indexOf('24/09/2026'));
  assert.ok(!html.includes('26/09/2026'));
});

test('relatório vazio e nomes de produtos escapados', async () => {
  assert.match(await ambiente().executar('renderVendas({})'), /Nenhuma venda no período/);
  const venda = { ...vendas[0], itens_venda: [{ ...vendas[0].itens_venda[0], nome_produto: '<img src=x onerror=alert(1)>' }] };
  const html = await ambiente([venda]).executar('renderVendas({})');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('seletor aplica período e mantém erro de datas sem navegar', () => {
  const a = ambiente();
  assert.equal(a.elemento('modoVendas').value, 'personalizado');
  a.elemento('modoVendas').value = 'mensal';
  a.elemento('modoVendas').change();
  assert.equal(a.elemento('campoFimVendas').hidden, true);
  a.elemento('dataVendas').value = '2026-09-25';
  a.elemento('filtroVendas').submit({ preventDefault() {} });
  assert.match(a.window.location.href, /inicio=2026-09-01&fim=2026-09-30&periodo=mensal/);
  a.window.location.href = '';
  a.elemento('dataVendas').value = '';
  a.elemento('filtroVendas').submit({ preventDefault() {} });
  assert.equal(a.window.location.href, '');
  assert.equal(a.elemento('erroFiltroVendas').hidden, false);
});

test('impressão resumida por padrão; detalhada abre todos os dias e restaura a tela', () => {
  const a = ambiente();
  a.eventos.get('beforeprint')();
  assert.equal(a.classes.has('imprimir-vendas-detalhadas'), false);
  a.eventos.get('afterprint')();
  a.elemento('imprimirDetalhesVendas').checked = true;
  a.eventos.get('beforeprint')();
  a.eventos.get('beforeprint')();
  assert.equal(a.classes.has('imprimir-vendas-detalhadas'), true);
  assert.ok(a.dias.every(dia => dia.open));
  a.eventos.get('afterprint')();
  assert.deepEqual(a.dias.map(dia => dia.open), [false, true]);
  assert.equal(a.classes.size, 0);
  const css = ler('relatorio-gerado.css');
  assert.match(css, /@media print\s*\{\s*\.vendas-detalhadas\s*\{ display: none; \}/);
});

const perdasSobras = [
  { registrada_em: '2026-09-26T01:00:00Z', tipo: 'sobra', nome_produto: 'Coxinha', quantidade: 1, custo_total: 3, motivo: 'Sobra do dia' },
  { registrada_em: '2026-09-24T16:00:00Z', tipo: 'perda', nome_produto: 'Pão', quantidade: 10, custo_total: 5, motivo: '<img src=x onerror=alert(1)>' },
];

test('perdas e sobras: contagens e custos separados, datas locais e conteúdo escapado', async () => {
  const html = await ambiente([], 'perdas', perdasSobras).executar('renderPerdas({})');
  assert.match(html, /Custo das perdas<\/span>\s*<b>R\$\s*5,00/);
  assert.match(html, /Custo das sobras<\/span>\s*<b>R\$\s*3,00/);
  assert.match(html, /Perdas · registros<\/span>\s*<b>1/);
  assert.match(html, /Sobras · registros<\/span>\s*<b>1/);
  assert.equal((html.match(/<details class="vendas-dia perdas-dia">/g) || []).length, 2);
  assert.ok(html.indexOf('25/09/2026') < html.indexOf('24/09/2026'));
  assert.ok(!html.includes('26/09/2026'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  const vazio = await ambiente([], 'perdas').executar('renderPerdas({})');
  assert.match(vazio, /Nenhuma perda ou sobra no período/);
  const umDia = await ambiente([], 'perdas', [perdasSobras[0]]).executar('renderPerdas({})');
  assert.match(umDia, /<details class="vendas-dia perdas-dia" open>/);
});

test('calendário de perdas mantém o tipo de relatório e esconde opção exclusiva de vendas', () => {
  const a = ambiente([], 'perdas');
  assert.equal(a.elemento('filtroVendas').hidden, false);
  assert.equal(a.elemento('opcaoDetalhesVendas').hidden, true);
  a.elemento('modoVendas').value = 'semanal';
  a.elemento('dataVendas').value = '2026-10-01';
  a.elemento('filtroVendas').submit({ preventDefault() {} });
  assert.match(a.window.location.href, /tipo=perdas&inicio=2026-09-28&fim=2026-10-04&periodo=semanal/);
});

test('impressão de perdas inclui todos os dias e restaura os blocos depois', () => {
  const a = ambiente([], 'perdas');
  a.eventos.get('beforeprint')();
  assert.ok(a.dias.every(dia => dia.open));
  a.eventos.get('afterprint')();
  assert.deepEqual(a.dias.map(dia => dia.open), [false, true]);
});
