document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const currentOrder = JSON.parse(localStorage.getItem('currentOrder') || 'null');
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    if (!currentOrder || !currentOrder.total) {
        alert('Nenhum ingresso selecionado. Retornando à seleção.');
        window.location.href = '/';
        return;
    }
    const formatCurrency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
            const label = currentOrder.source === 'luthbox' ? 'Produto' : 'Ingresso';
            $('order-summary').textContent = `${label}: ${currentOrder.title || 'Ingressos selecionados'} · Total: ${formatCurrency(currentOrder.total)}`;
        }
    }
    $('next-to-payment').addEventListener('click', event => {
        event.preventDefault();
        const form = $('info-form');
        const invalid = [...form.querySelectorAll('input[required]')].find(input => !input.value.trim() || (input.id === 'email' && !validEmail(input.value.trim())));
        if (invalid) { invalid.focus(); showError('Preencha os dados obrigatórios corretamente.', 1); return; }
        localStorage.setItem('checkoutInfo', JSON.stringify({ nome: $('nome').value.trim(), email: $('email').value.trim(), cpf: $('cpf').value.trim() }));
        renderStep(2);
    });
    $('back-to-info').addEventListener('click', () => renderStep(1));

    $('payment-form').addEventListener('submit', async event => {
        event.preventDefault();
        hideErrors();
        const button = $('submit-payment');
        const checkoutInfo = JSON.parse(localStorage.getItem('checkoutInfo') || '{}');
        button.disabled = true;
        button.textContent = 'Conectando ao Mercado Pago...';
        try {
            const response = await fetch('/pagamentos/mercadopago/preferencia', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartIds: currentOrder.source === 'cart' ? cartItems.map(item => item.cartId).filter(Boolean) : [],
                    showId: currentOrder.showId,
                    tickets: currentOrder.tickets,
                    comprador: checkoutInfo
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
        if (!paymentId) return;
        renderStep(3);
        $('confirmation-details').style.display = 'none';
        $('pending-details').style.display = 'block';
        $('result-title').textContent = 'Verificando pagamento';
        $('pending-message').textContent = 'Consultando a confirmação diretamente com o Mercado Pago...';
        try {
            const response = await fetch(`/pagamentos/mercadopago/status?payment_id=${encodeURIComponent(paymentId)}`);
            const result = await response.json();
            $('pending-details').style.display = 'none';
            if (!response.ok || !result.sucesso) throw new Error(result.mensagem || 'Não foi possível confirmar agora.');
            if (result.status === 'approved') {
                $('result-title').textContent = 'Pagamento aprovado!';
                $('product-title-confirm').textContent = currentOrder.title || 'Ingressos';
                $('total-confirm').textContent = formatCurrency(currentOrder.total);
                $('confirmation-details').style.display = 'block';
                localStorage.removeItem('checkoutInfo');
                localStorage.removeItem('cartItems');
                localStorage.removeItem('currentOrder');
            } else {
                $('result-title').textContent = result.status === 'rejected' ? 'Pagamento não aprovado' : 'Pagamento em processamento';
                $('pending-message').textContent = result.status === 'rejected'
                    ? 'O Mercado Pago não aprovou este pagamento. Você pode tentar novamente pelo carrinho.'
                    : 'O Mercado Pago ainda está processando este pagamento. O pedido será registrado quando houver confirmação.';
                $('pending-details').style.display = 'block';
            }
        } catch (error) {
            $('result-title').textContent = 'Não foi possível confirmar agora';
            $('pending-message').textContent = error.message;
            $('pending-details').style.display = 'block';
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    renderStep(1);
    processReturn();
});
