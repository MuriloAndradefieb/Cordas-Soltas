document.addEventListener('DOMContentLoaded', () => {
    const inputFull      = document.getElementById('qty-full');
    const inputHalf      = document.getElementById('qty-half');
    const totalValueEl   = document.getElementById('total-value');
    const buyButton      = document.getElementById('buy-button');
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

            // Gera o payload final para a página de pagamento
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

    calcularTotal();
});