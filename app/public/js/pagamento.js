document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    // Solicitação Luthbox (/pagamento?luthbox=ID): os dados vêm do servidor e
    // o carrinho de ingressos guardado no navegador não é usado nem apagado.
    const pedidoLuthbox = window.PEDIDO_LUTHBOX || null;
    const currentOrder = pedidoLuthbox
        ? { source: 'luthbox', solicitacaoId: pedidoLuthbox.id, title: pedidoLuthbox.title, total: pedidoLuthbox.total }
        : JSON.parse(localStorage.getItem('currentOrder') || 'null');
    const cartItems = pedidoLuthbox ? [] : JSON.parse(localStorage.getItem('cartItems') || '[]');
    if (!currentOrder || !currentOrder.total) {
        alert('Nenhum ingresso selecionado. Retornando à seleção.');
        window.location.href = '/';
        return;
    }
    const formatCurrency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    let returnTimer;
    // A página não pede mais nome, e-mail, CPF nem endereço (o Mercado Pago
    // pede o que precisar no checkout). Apaga dados guardados por versões antigas.
    localStorage.removeItem('checkoutInfo');

    // Resumo dos ingressos no passo "Informações" (a Luthbox já vem pronta do servidor)
    function renderResumoIngressos() {
        const caixa = $('compra-ingressos');
        if (!caixa) return;
        let itens = [];
        if (currentOrder.source === 'cart' && cartItems.length) {
            itens = cartItems.map(item => ({
                show: item.titulo || currentOrder.title || '',
                nome: item.tipo_ingresso || 'Ingresso',
                quantidade: Number(item.quantidade) || 1,
                preco: Number(item.preco) || 0
            }));
        } else if (currentOrder.tickets) {
            // Compra direta pela página do show: inteira e meia (meia = metade do preço)
            const inteiras = Number(currentOrder.tickets.full) || 0;
            const meias = Number(currentOrder.tickets.half) || 0;
            const precoInteira = inteiras + meias / 2 > 0 ? Number(currentOrder.total) / (inteiras + meias / 2) : 0;
            if (inteiras) itens.push({ show: currentOrder.title, nome: 'Pista Inteira', quantidade: inteiras, preco: precoInteira });
            if (meias) itens.push({ show: currentOrder.title, nome: 'Pista Meia-Entrada', quantidade: meias, preco: precoInteira / 2 });
        }
        if (!itens.length) itens = [{ show: '', nome: currentOrder.title || 'Ingressos', quantidade: 1, preco: Number(currentOrder.total) }];
        // Um show só: nome do show em destaque acima da lista; vários: o show aparece em cada item
        const shows = [...new Set(itens.map(item => item.show).filter(Boolean))];
        if (shows.length === 1) {
            $('compra-show-titulo').textContent = shows[0];
            $('compra-show').hidden = false;
        }
        const lista = $('compra-itens');
        lista.replaceChildren(...itens.map(item => {
            const li = document.createElement('li');
            const qtd = document.createElement('span');
            qtd.className = 'compra-qtd';
            const x = document.createElement('span');
            x.setAttribute('aria-hidden', 'true');
            x.textContent = '×';
            const oculto = document.createElement('span');
            oculto.className = 'compra-oculto';
            oculto.textContent = item.quantidade === 1 ? ' ingresso' : ' ingressos';
            qtd.append(String(item.quantidade), x, oculto);
            const nome = document.createElement('span');
            nome.className = 'compra-nome';
            const forte = document.createElement('strong');
            forte.textContent = item.nome;
            const detalhe = document.createElement('small');
            detalhe.textContent = `${shows.length > 1 && item.show ? `${item.show} · ` : ''}${formatCurrency(item.preco)} cada`;
            nome.append(forte, ' ', detalhe);
            const subtotal = document.createElement('span');
            subtotal.className = 'compra-subtotal';
            subtotal.textContent = formatCurrency(item.preco * item.quantidade);
            li.append(qtd, nome, subtotal);
            return li;
        }));
        $('compra-total').textContent = formatCurrency(currentOrder.total);
        caixa.hidden = false;
    }
    function showError(message, step) {
        const box = $(`error-message-step${step}`);
        if (box) { box.textContent = message; box.style.display = 'block'; }
    }
    function hideErrors() {
        document.querySelectorAll('.error-message-checkout').forEach(box => { box.textContent = ''; box.style.display = 'none'; });
    }
    function renderStep(step) {
        document.querySelectorAll('.step-section').forEach(section => { section.style.display = 'none'; });
        $(`step-${step}`).style.display = 'block';
        document.querySelectorAll('.step-item').forEach(item => item.classList.toggle('active', Number(item.dataset.step) <= step));
        hideErrors();
        if (step === 2) {
            $('order-summary').textContent = currentOrder.source === 'luthbox'
                ? `${currentOrder.title} · Total: ${formatCurrency(currentOrder.total)}`
                : `Ingresso: ${currentOrder.title || 'Ingressos selecionados'} · Total: ${formatCurrency(currentOrder.total)}`;
        }
    }
    $('next-to-payment').addEventListener('click', event => {
        event.preventDefault();
        renderStep(2);
    });
    $('back-to-info').addEventListener('click', () => renderStep(1));

    $('payment-form').addEventListener('submit', async event => {
        event.preventDefault();
        hideErrors();
        const button = $('submit-payment');
        button.disabled = true;
        button.textContent = 'Conectando ao Mercado Pago...';
        try {
            const response = await fetch('/pagamentos/mercadopago/preferencia', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentOrder.source === 'luthbox'
                    ? { luthboxSolicitacaoId: currentOrder.solicitacaoId }
                    : {
                        cartIds: currentOrder.source === 'cart' ? cartItems.map(item => item.cartId).filter(Boolean) : [],
                        showId: currentOrder.showId,
                        tickets: currentOrder.tickets
                    })
            });
            const result = await response.json();
            if (!response.ok || !result.sucesso) throw new Error(result.mensagem || 'Não foi possível iniciar o checkout.');
            if (window.MercadoPago && window.MP_PUBLIC_KEY && result.preferenceId) {
                const wallet = $('wallet_container');
                wallet.style.display = 'block';
                try {
                    if (window.checkoutButton?.unmount) await window.checkoutButton.unmount();
                    wallet.replaceChildren();
                    const mp = new window.MercadoPago(window.MP_PUBLIC_KEY, { locale: 'pt-BR' });
                    window.checkoutButton = await mp.bricks().create('wallet', 'wallet_container', {
                        initialization: { preferenceId: result.preferenceId, redirectMode: 'self' },
                        callbacks: { onReady: () => {}, onError: error => console.error('Erro no Checkout Pro:', error) }
                    });
                    button.style.display = 'none';
                    return;
                } catch (error) {
                    console.error('Falha ao exibir o Checkout Pro:', error);
                    window.location.assign(result.url);
                    return;
                }
            }
            window.location.assign(result.url);
        } catch (error) {
            showError(error.message || 'Falha ao iniciar o pagamento.', 2);
            button.disabled = false;
            button.textContent = 'Ir ao Mercado Pago';
        }
    });

    async function processReturn() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('mp')) return;
        const paymentId = params.get('payment_id') || params.get('collection_id');
        const externalReference = params.get('external_reference');
        if (!paymentId && !externalReference) return;
        renderStep(3);
        $('confirmation-details').style.display = 'none';
        $('pending-details').style.display = 'block';
        $('result-title').textContent = 'Verificando pagamento';
        $('pending-message').textContent = 'Consultando a confirmação diretamente com o Mercado Pago...';
        try {
            const statusParams = new URLSearchParams(paymentId ? { payment_id: paymentId } : { external_reference: externalReference });
            const response = await fetch(`/pagamentos/mercadopago/status?${statusParams}`);
            const result = await response.json();
            $('pending-details').style.display = 'none';
            if (!response.ok || !result.sucesso) throw new Error(result.mensagem || 'Não foi possível confirmar agora.');
            if (result.status === 'approved') {
                $('result-title').textContent = 'Pagamento aprovado!';
                $('product-title-confirm').textContent = currentOrder.title || 'Ingressos';
                $('total-confirm').textContent = formatCurrency(currentOrder.total);
                $('confirmation-details').style.display = 'block';
                const destino = pedidoLuthbox
                    ? { url: '/luthbox/solicitacoes', nome: 'Minhas solicitações' }
                    : { url: '/meus-ingressos', nome: 'Meus ingressos' };
                const countdown = $('return-countdown');
                let secondsRemaining = 8;
                countdown.hidden = false;
                countdown.textContent = `Redirecionando para ${destino.nome} em ${secondsRemaining} segundos...`;
                clearInterval(returnTimer);
                returnTimer = setInterval(() => {
                    secondsRemaining -= 1;
                    if (secondsRemaining <= 0) {
                        clearInterval(returnTimer);
                        window.location.assign(destino.url);
                        return;
                    }
                    countdown.textContent = `Redirecionando para ${destino.nome} em ${secondsRemaining} segundos...`;
                }, 1000);
                if (!pedidoLuthbox) {
                    localStorage.removeItem('cartItems');
                    localStorage.removeItem('currentOrder');
                }
            } else {
                $('result-title').textContent = result.status === 'rejected' ? 'Pagamento não aprovado' : 'Pagamento em processamento';
                if (pedidoLuthbox) {
                    $('pending-message').textContent = result.status === 'rejected'
                        ? 'O Mercado Pago não aprovou este pagamento. A solicitação continua aguardando pagamento: tente de novo com outra forma de pagamento.'
                        : 'O Mercado Pago ainda está processando este pagamento. A solicitação será marcada como paga quando houver confirmação.';
                    if (result.status === 'rejected' && $('retry-payment')) $('retry-payment').hidden = false;
                } else {
                    $('pending-message').textContent = result.status === 'rejected'
                        ? 'O Mercado Pago não aprovou este pagamento. Você pode tentar novamente pelo carrinho.'
                        : 'O Mercado Pago ainda está processando este pagamento. O pedido será registrado quando houver confirmação.';
                }
                $('pending-details').style.display = 'block';
            }
        } catch (error) {
            $('result-title').textContent = 'Não foi possível confirmar agora';
            $('pending-message').textContent = error.message;
            $('pending-details').style.display = 'block';
        }
        // Tira da barra de endereço os dados do retorno (mantém a solicitação Luthbox)
        window.history.replaceState({}, document.title, window.location.pathname + (pedidoLuthbox ? `?luthbox=${pedidoLuthbox.id}` : ''));
    }
    renderResumoIngressos();
    renderStep(1);
    processReturn();
});
