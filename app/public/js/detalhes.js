document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    let errorTimeout;

    const errorMessageEl = $('error-message');
    const buyButton      = $('buy-button');
    const totalValueEl   = $('total-value');

    // showData é passado pelo detalhes.ejs via <script> inline
    if (!showData) {
        console.error('Dados do show não encontrados.');
        return;
    }

    const ticketState = {
        full: 0, half: 0, blocks: 0, total: 0,
        prices: {
            full:   showData.priceFull,
            half:   showData.priceHalf,
            blocks: showData.priceBlocks
        }
    };

    // ── Feedback de erro ──────────────────────────────────────────────────────
    const hideError = () => {
        if (errorMessageEl) { errorMessageEl.classList.remove('visible'); errorMessageEl.textContent = ''; }
        if (buyButton)       buyButton.classList.remove('error-border');
        clearTimeout(errorTimeout);
    };

    const showError = (msg) => {
        if (errorMessageEl && buyButton) {
            errorMessageEl.textContent = msg;
            errorMessageEl.classList.add('visible');
            buyButton.classList.add('error-border');
            clearTimeout(errorTimeout);
            errorTimeout = setTimeout(hideError, 5000);
        }
    };

    const formatCurrency = v => parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ── Menu lateral ──────────────────────────────────────────────────────────
    const hamburgerButton = document.querySelector('.hamburger-button');
    const sidebar         = $('sidebar-menu');
    const overlayEl       = $('menu-overlay');
    const closeMenuBtn    = $('close-menu-btn');

    const toggleMenu = () => {
        if (sidebar && overlayEl) {
            const isOpen = sidebar.classList.toggle('open');
            overlayEl.classList.toggle('open');
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }
    };

    [hamburgerButton, closeMenuBtn, overlayEl].forEach(el => {
        if (el) el.addEventListener('click', toggleMenu);
    });

    document.querySelectorAll('.sidebar-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar?.classList.contains('open')) toggleMenu();
        });
    });

    // ── Lógica de ingressos ───────────────────────────────────────────────────
    const updateState = () => {
        const fullQty   = parseInt($('qty-full')?.value)   || 0;
        const halfQty   = parseInt($('qty-half')?.value)   || 0;
        const blocksQty = parseInt($('qty-blocks')?.value) || 0;

        ticketState.full   = fullQty;
        ticketState.half   = halfQty;
        ticketState.blocks = blocksQty;
        ticketState.total  = (fullQty * ticketState.prices.full) + (halfQty * ticketState.prices.half);

        if (totalValueEl) totalValueEl.textContent = formatCurrency(ticketState.total);
        if (ticketState.total > 0) hideError();
    };

    const handleQtyBtn = (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const container = button.closest('.quantity-control');
        const type      = container.querySelector('input').id.replace('qty-', '');
        const input     = $('qty-' + type);
        if (!input) return;

        let val = parseInt(input.value);
        val += button.className.includes('plus') ? 1 : -1;
        val  = Math.max(0, Math.min(type === 'blocks' ? 5 : 10, val));
        input.value = val;
        updateState();
    };

    document.querySelectorAll('.quantity-control button').forEach(b  => b.addEventListener('click', handleQtyBtn));
    document.querySelectorAll('.quantity-control input').forEach(inp => inp.addEventListener('change', updateState));

    updateState();

    // ── Comprar ───────────────────────────────────────────────────────────────
    if (buyButton) {
        buyButton.addEventListener('click', () => {
            updateState();

            if (ticketState.total === 0) {
                showError('Por favor, selecione pelo menos um ingresso para continuar.');
                return;
            }

            // Verificação de login via variável injetada pelo EJS (não localStorage)
            if (!usuarioLogado) {
                alert('Você precisa estar logado para comprar ingressos.');
                window.location.href = '/login';
                return;
            }

            const order = {
                showId:    showData.id,
                showTitle: showData.title,
                title:     showData.title,
                tickets:   { full: ticketState.full, half: ticketState.half, blocks: ticketState.blocks },
                total:     ticketState.total,
                priceDetails: ticketState.prices,
                orderDate: new Date().toISOString()
            };

            localStorage.setItem('currentOrder', JSON.stringify(order));
            window.location.href = '/pagamento';
        });
    }
});