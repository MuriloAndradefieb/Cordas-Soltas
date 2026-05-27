document.addEventListener('DOMContentLoaded', () => {
    const corpoResumo = document.getElementById('corpo-resumo');
    const displayTotal = document.getElementById('summary-total');

    function calcularResumoCarrinho() {
        if (!corpoResumo) return;
        
        let totalGeral = 0;
        corpoResumo.innerHTML = ''; // Limpa o estado anterior do resumo lateral

        // Varre todos os cards de ingressos presentes na página
        document.querySelectorAll('.item-ingresso').forEach(card => {
            const checkbox = card.querySelector('.item-checkbox');
            
            // Só processa e soma se o checkbox do item estiver marcado
            if (checkbox && checkbox.checked) {
                const nomeShow = card.querySelector('.item-nome-banco').textContent.trim();
                const tipoIngresso = card.querySelector('.item-nome-ingresso').textContent.trim();
                const qtd = parseInt(card.querySelector('.qtd-num').textContent) || 0;
                
                const precoTexto = card.querySelector('.item-preco-txt').textContent;
                const precoUnitario = parseFloat(precoTexto.replace(/\./g, '').replace(',', '.'));
                
                const subtotalItem = precoUnitario * qtd;
                totalGeral += subtotalItem;

                // Cria a linha respectiva combinando Nome do Show + Variante de Ingresso
                const tr = document.createElement('tr');
                tr.className = 'linha-resumo';
                tr.innerHTML = `
                    <td>${nomeShow} - ${tipoIngresso} (${qtd}) :</td>
                    <td class="valor-resumo">R$ ${subtotalItem.toFixed(2).replace('.', ',')}</td>
                `;
                corpoResumo.appendChild(tr);
            }
        });

        // Caso o usuário desmarque todos os itens da lista
        if (corpoResumo.children.length === 0) {
            corpoResumo.innerHTML = `
                <tr class="linha-resumo">
                    <td colspan="2" style="color: #bcbcbc; padding: 10px 0; font-size: 14px;">Nenhum ingresso selecionado</td>
                </tr>
            `;
        }

        // Atualiza o visor do total geral da compra
        if (displayTotal) {
            displayTotal.textContent = totalGeral.toFixed(2).replace('.', ',');
        }
    }

    // Monitora mudanças manuais nos checkboxes de seleção
    document.querySelectorAll('.item-checkbox').forEach(box => {
        box.addEventListener('change', calcularResumoCarrinho);
    });

    // Controla os cliques nos botões de incremento (+) e decremento (—)
    document.querySelectorAll('.btn-qtd').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.item-ingresso');
            const outputQtd = card.querySelector('.qtd-num');
            let qtdAtual = parseInt(outputQtd.textContent) || 1;

            if (btn.classList.contains('minus')) {
                if (qtdAtual > 1) outputQtd.textContent = qtdAtual - 1;
            } else if (btn.classList.contains('plus')) {
                outputQtd.textContent = qtdAtual + 1;
            }

            // Recalcula o resumo lateral imediatamente após a alteração numérica
            calcularResumoCarrinho();
        });
    });

    // Executa a primeira totalização assim que a página termina de carregar
    calcularResumoCarrinho();
});
// Adicione este bloco dentro do seu document.addEventListener('DOMContentLoaded', () => { ... })
// Pode colocar logo abaixo da função atualizarResumoCompra();

const botaoCheckout = document.getElementById('checkout-button');
const alertaLogin = document.getElementById('alerta-login-carrinho');

if (botaoCheckout && alertaLogin) {
    botaoCheckout.addEventListener('click', () => {
        const estaLogado = botaoCheckout.getAttribute('data-logado') === 'true';

        if (!estaLogado) {
            // Apenas exibe o aviso customizado na tela com o link para clicar
            alertaLogin.style.display = 'flex';
        } else {
            // Se estiver logado, segue para o pagamento
            window.location.href = '/pagamento';
        }
    });
}