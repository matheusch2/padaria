/* ============================================================================
   PADARIA — Pontuação automática de números (ponto de milhar / vírgula decimal)
   ----------------------------------------------------------------------------
   Digita 1000  -> mostra 1.000
   Digita 1500,50 -> mostra 1.500,50  (ponto = milhar, vírgula = decimal)

   COMO USAR (bem simples):
   1) Linke este arquivo no fim do HTML:  <script src="js/numeros.js"></script>
   2) Nos campos, escolha o tipo:
        • Dinheiro / decimal:  <input type="text" inputmode="decimal" placeholder="Ex: 1.500,00">
        • Quantidade inteira:  <input type="text" class="milhar" inputmode="numeric" placeholder="Ex: 1.000">
   3) Pronto — a pontuação aparece sozinha enquanto digita. Não precisa mais nada.

   ⚠️ IMPORTANTE ao SALVAR/CALCULAR: o campo mostra texto ("1.500,50"), então
   antes de mandar pro banco ou fazer conta, converta pra número com:
        const preco  = parseMoedaBR(campo.value);     // "1.500,50" -> 1500.5
        const qtd    = parseInteiroBR(campo.value);    // "1.000"    -> 1000
   ============================================================================ */

/* ---- 1. LER de volta como NÚMERO (use na hora de salvar/calcular) -------- */

// Entende o padrão brasileiro. Vírgula é SEMPRE decimal. Ponto é milhar,
// EXCETO quando é o único ponto seguido de 1-2 dígitos ("250.75" = decimal do
// teclado). Sem essa exceção, "250.75" viraria 25.075 — erro de 100x.
function _numeroBR(str) {
  if (str === null || str === undefined) return null;
  const limpo = String(str).trim().replace(/[^\d.,-]/g, "");
  if (!limpo) return null;
  let normalizado;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    const partes = limpo.split(".");
    normalizado = (partes.length === 2 && partes[1].length >= 1 && partes[1].length <= 2)
      ? limpo                      // ponto decimal: 250.75 / 1.5
      : limpo.replace(/\./g, "");  // ponto de milhar: 1.000 / 1.234.567
  }
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : null;
}

function parseMoedaBR(str)   { const n = _numeroBR(str); return n === null ? 0   : n; }
function parseDecimalBR(str) { const n = _numeroBR(str); return n === null ? NaN : n; }
function parseInteiroBR(str) { return Number(String(str || "").replace(/\D/g, "")) || 0; }

/* ---- 2. MOSTRAR pontuado (roda sozinho enquanto digita) ------------------ */

// Dinheiro/decimal: ponto de milhar + vírgula decimal, cursor no lugar certo.
function _formatarMoedaInput(input) {
  const pos = input.selectionStart;
  const oldLen = input.value.length;
  let v = input.value.replace(/[^\d,]/g, "");
  const partes = v.split(",");
  if (partes.length > 2) v = partes[0] + "," + partes.slice(1).join("");
  const [intParte, decParte] = v.split(",");
  const intFmt = (intParte || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  input.value = decParte !== undefined ? intFmt + "," + decParte : intFmt;
  const diff = input.value.length - oldLen;
  try { input.setSelectionRange(pos + diff, pos + diff); } catch (e) {}
}

// Ao sair do campo (blur): fixa em 2 casas — "1.500,5" vira "1.500,50".
function formatarMoedaBlur(input) {
  const v = input.value.trim();
  if (!v) return;
  const n = _numeroBR(v);
  if (n === null) { input.value = ""; return; }
  input.value = n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Inteiro puro (quantidade, população): só milhar, sem decimal.
function formatarMilhar(input) {
  let valor = input.value.replace(/\D/g, "");
  input.value = valor ? Number(valor).toLocaleString("pt-BR") : "";
}

/* ---- 3. LIGAR nos campos automaticamente (você não faz nada) ------------- */

function _ligarCampo(input) {
  if (input._numAtached) return;
  input._numAtached = true;
  if (input.classList.contains("milhar")) {
    input.addEventListener("input", () => formatarMilhar(input));
  } else { // inputmode="decimal" -> dinheiro/decimal
    input.addEventListener("input", () => _formatarMoedaInput(input));
    input.addEventListener("blur",  () => formatarMoedaBlur(input));
  }
}

(function () {
  const SELETOR = 'input[type="text"][inputmode="decimal"], input.milhar';
  function varrer(raiz) {
    if (!raiz.querySelectorAll) return;
    raiz.querySelectorAll(SELETOR).forEach(_ligarCampo);
    if (raiz.matches && raiz.matches(SELETOR)) _ligarCampo(raiz);
  }
  // Campos que já existem + campos criados depois (telas trocadas por JS)
  const observer = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) varrer(n); }));
  });
  document.addEventListener("DOMContentLoaded", () => {
    varrer(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
