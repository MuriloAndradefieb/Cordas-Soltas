document.addEventListener('DOMContentLoaded', () => {
    const inputFull       = document.getElementById('qty-full');
    const inputHalf       = document.getElementById('qty-half');
    const totalValueEl   = document.getElementById('total-value');
    const buyButton      = document.getElementById('buy-button');
    const addToCartBtn   = document.getElementById('add-to-cart-button');
    const errorMessageEl = document.getElementById('error-message');
    const avisoLoginEl   = document.getElementById('aviso-login');

    const ticketState = { full: 0, half: 0, total: 0 };
    let timeoutAviso;

    const formatarMoeda = v => parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    function limparAvisos() {
        if (errorMessageEl) errorMessageEl.classList.remove('visivel');
        if (avisoLoginEl) avisoLoginEl.classList.remove('visivel');
        clearTimeout(timeoutAviso);
    }

    function mostrarFeedback(elemento) {
        limparAvisos();
        if (elemento) {
            elemento.classList.add('visivel');
            timeoutAviso = setTimeout(limparAvisos, 5000);
        }
    }

    function calcularTotal() {
        ticketState.full = parseInt(inputFull.value) || 0;
        ticketState.half = parseInt(inputHalf.value) || 0;

        ticketState.total = (ticketState.full * showRealDoBanco.priceFull) + 
                            (ticketState.half * showRealDoBanco.priceHalf);

        if (totalValueEl) totalValueEl.textContent = formatarMoeda(ticketState.total);
        if (ticketState.total > 0) limparAvisos();
    }

    // Gerenciador dos botões de + e -
    document.querySelectorAll('.quantity-btn').forEach(botao => {
        botao.addEventListener('click', () => {
            const tipo = botao.dataset.type;
            const inputAlvo = tipo === 'full' ? inputFull : inputHalf;
            let valorAtual = parseInt(inputAlvo.value) || 0;

            if (botao.classList.contains('plus')) {
                valorAtual = Math.min(10, valorAtual + 1);
            } else {
                valorAtual = Math.max(0, valorAtual - 1);
            }

            inputAlvo.value = valorAtual;
            calcularTotal();
        });
    });

    // ── BOTÃO: COMPRAR INGRESSOS (Mantém validação de login para checkout direto) ──
    if (buyButton) {
        buyButton.addEventListener('click', () => {
            if (ticketState.total === 0) {
                mostrarFeedback(errorMessageEl);
                return;
            }

            if (!usuarioLogado) {
                mostrarFeedback(avisoLoginEl);
                return;
            }

            const currentOrder = {
                showId:       showRealDoBanco.id,
                title:        showRealDoBanco.title,
                tickets:      { full: ticketState.full, half: ticketState.half },
                total:        ticketState.total,
                orderDate:    new Date().toISOString()
            };

            localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
            window.location.href = '/pagamento';
        });
    }

    // ── BOTÃO: ADICIONAR AO CARRINHO (Livre e Dinâmico, sem barreira de login) ──
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async () => {
            // A única validação necessária é garantir que ele escolheu pelo menos 1 ingresso
            if (ticketState.total === 0) {
                mostrarFeedback(errorMessageEl);
                return;
            }

            try {
                // Envia as quantidades selecionadas para a sessão do carrinho
                const resposta = await fetch('/carrinho/adicionar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        showId: showRealDoBanco.id,
                        quantidadeInteira: ticketState.full,
                        quantidadeMeia: ticketState.half
                    })
                });

                const resultado = await resposta.json();

                if (resultado.sucesso) {
                    // Vai para a página do carrinho exibir a lista com o cálculo dinâmico
                    window.location.href = '/carrinho';
                } else {
                    alert(resultado.mensagem || 'Erro ao adicionar itens ao carrinho.');
                }

            } catch (erro) {
                console.error('Erro na requisição do carrinho:', erro);
                alert('Não foi possível se conectar ao servidor.');
            }
        });
    }

    calcularTotal();
});