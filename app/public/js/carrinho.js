document.addEventListener('DOMContentLoaded', () => {
    const corpoResumo  = document.getElementById('corpo-resumo');
    const displayTotal = document.getElementById('summary-total');

    function calcularResumoCarrinho() {
        if (!corpoResumo) return;

        let totalGeral = 0;
        corpoResumo.innerHTML = '';

        document.querySelectorAll('.item-ingresso').forEach(card => {
            const checkbox = card.querySelector('.item-checkbox');
            if (checkbox && checkbox.checked) {
                const nomeShow    = card.querySelector('.item-nome-banco').textContent.trim();
                const tipoIngresso = card.querySelector('.item-nome-ingresso').textContent.trim();
                const qtd         = parseInt(card.querySelector('.qtd-num').textContent) || 0;
                const precoTexto  = card.querySelector('.item-preco-txt').textContent;
                const precoUnit   = parseFloat(precoTexto.replace(/\./g, '').replace(',', '.'));
                const subtotal    = precoUnit * qtd;
                totalGeral       += subtotal;

                const tr = document.createElement('tr');
                tr.className = 'linha-resumo';
                tr.innerHTML = `
                    <td>${nomeShow} - ${tipoIngresso} (${qtd}) :</td>
                    <td class="valor-resumo">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                `;
                corpoResumo.appendChild(tr);
            }
        });

        if (corpoResumo.children.length === 0) {
            corpoResumo.innerHTML = `
                <tr class="linha-resumo">
                    <td colspan="2" style="color:#bcbcbc;padding:10px 0;font-size:14px;">Nenhum ingresso selecionado</td>
                </tr>
            `;
        }

        if (displayTotal) {
            displayTotal.textContent = totalGeral.toFixed(2).replace('.', ',');
        }
    }

    document.querySelectorAll('.item-checkbox').forEach(box => {
        box.addEventListener('change', calcularResumoCarrinho);
    });

    document.querySelectorAll('.btn-qtd').forEach(btn => {
        btn.addEventListener('click', () => {
            const card    = btn.closest('.item-ingresso');
            const output  = card.querySelector('.qtd-num');
            let qtdAtual  = parseInt(output.textContent) || 1;

            if (btn.classList.contains('minus')) {
                if (qtdAtual > 1) output.textContent = qtdAtual - 1;
            } else if (btn.classList.contains('plus')) {
                output.textContent = qtdAtual + 1;
            }

            calcularResumoCarrinho();
        });
    });

    calcularResumoCarrinho();

    // ── Botão Finalizar Compra ─────────────────────────────────────────
    const botaoCheckout = document.getElementById('checkout-button');
    const alertaLogin   = document.getElementById('alerta-login-carrinho');

    if (botaoCheckout && alertaLogin) {
        botaoCheckout.addEventListener('click', () => {
            const estaLogado = botaoCheckout.getAttribute('data-logado') === 'true';

            if (!estaLogado) {
                alertaLogin.style.display = 'flex';
                return;
            }

            // ── Coleta itens selecionados para enviar ao servidor após pagamento ──
            const itensSelecionados = [];
            document.querySelectorAll('.item-ingresso').forEach(card => {
                const checkbox = card.querySelector('.item-checkbox');
                if (!checkbox || !checkbox.checked) return;

                const cartId      = card.dataset.cartId;
                const showId      = card.dataset.showId;
                const tipoIngresso = card.querySelector('.item-nome-ingresso').textContent.trim();
                const quantidade  = parseInt(card.querySelector('.qtd-num').textContent) || 1;
                const precoTexto  = card.querySelector('.item-preco-txt').textContent;
                const preco       = parseFloat(precoTexto.replace(/\./g, '').replace(',', '.'));

                itensSelecionados.push({ cartId, id: showId, tipo_ingresso: tipoIngresso, quantidade, preco });
            });

            // Persiste no localStorage para o pagamento.js recuperar e confirmar
            localStorage.setItem('cartItems', JSON.stringify(itensSelecionados));

            // Monta currentOrder básico para o fluxo de pagamento existente
            const totalGeral = itensSelecionados.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
            const tituloShow = document.querySelector('.item-nome-banco')?.textContent.trim() || 'Ingressos';

            const currentOrder = {
                title:  tituloShow,
                total:  totalGeral,
                showId: itensSelecionados[0]?.id || null
            };
            localStorage.setItem('currentOrder', JSON.stringify(currentOrder));

            window.location.href = '/pagamento';
        });
    }
});