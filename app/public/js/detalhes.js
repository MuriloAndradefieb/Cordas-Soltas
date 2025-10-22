document.addEventListener('DOMContentLoaded', () => {
    // 1. Funções Auxiliares e Elementos
    const $ = id => document.getElementById(id); // Auxiliar para document.getElementById
    let errorTimeout; 

    const errorMessageEl = $('error-message');
    const buyButton = $('buy-button'); 
    const totalValueEl = $('total-value');
    
    // Configurações de Estado do Aplicativo
    const showData = JSON.parse(localStorage.getItem('selectedShow'));

    if (!showData) {
        console.error("Dados do show não encontrados. O script de detalhes não pode ser executado.");
        return; 
    }

    const ticketState = {
        full: 0,
        half: 0,
        blocks: 0,
        total: 0, 
        prices: {
            full: showData.priceFull,
            half: showData.priceHalf,
            blocks: showData.priceBlocks
        }
    };

    // 2. Funções de Feedback (Mensagens de Erro)

    const hideErrorMessage = () => {
        if (errorMessageEl) {
            errorMessageEl.classList.remove('visible');
            errorMessageEl.textContent = ''; 
        }
        if (buyButton) {
            buyButton.classList.remove('error-border'); 
        }
        clearTimeout(errorTimeout); 
    };

    const showErrorMessage = (message) => {
        if (errorMessageEl && buyButton) {
            errorMessageEl.textContent = message;
            errorMessageEl.classList.add('visible');
            buyButton.classList.add('error-border'); 

            clearTimeout(errorTimeout);
            errorTimeout = setTimeout(hideErrorMessage, 5000); 
        }
    };
    
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // 3. Funções do Menu Lateral (Sidebar)
    const hamburgerButton = document.querySelector('.hamburger-button'); 
    const sidebar = $('sidebar-menu');           
    const overlay = $('menu-overlay');             
    const closeMenuBtn = $('close-menu-btn');    

    const toggleMenu = () => {
        if (sidebar && overlay) {
            const isMenuOpen = sidebar.classList.toggle('open');
            overlay.classList.toggle('open'); 
            document.body.style.overflow = isMenuOpen ? 'hidden' : ''; 
        }
    };

    // Event Listeners do Menu
    [hamburgerButton, closeMenuBtn, overlay].forEach(element => {
        if (element) element.addEventListener('click', toggleMenu);
    });

    // Fecha o menu ao clicar em um link
    document.querySelectorAll('.sidebar-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar?.classList.contains('open')) {
                toggleMenu(); 
            }
        });
    });

    // 4. Lógica de Ingressos
    
    const updateTicketState = () => {
        const fullQty = parseInt($('qty-full')?.value) || 0;
        const halfQty = parseInt($('qty-half')?.value) || 0;
        
        // O campo 'blocks' não é usado na soma total no código original, apenas manipulado no clique, 
        // mas é mantido no ticketState para consistência (embora não seja lido aqui).
        const blocksQty = parseInt($('qty-blocks')?.value) || 0; 

        ticketState.full = fullQty;
        ticketState.half = halfQty;
        ticketState.blocks = blocksQty;

        ticketState.total = 
            (fullQty * ticketState.prices.full) +
            (halfQty * ticketState.prices.half);

        if (totalValueEl) {
            totalValueEl.textContent = formatCurrency(ticketState.total);
        }

        if (ticketState.total > 0) {
            hideErrorMessage();
        }
    };

    // Função de Controle de Quantidade
    const handleQuantityControl = (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const container = button.closest('.quantity-control');
        const type = container.querySelector('input').id.replace('qty-', '');
        const input = $('qty-' + type);
        
        if (!input) return;

        let currentValue = parseInt(input.value);
        const action = button.className.includes('plus') ? 1 : -1;
        
        currentValue += action;
        if (currentValue < 0) currentValue = 0;
        
        // Limite de quantidade
        const maxQty = type === 'blocks' ? 5 : 10;
        if (currentValue > maxQty) currentValue = maxQty;

        input.value = currentValue;
        updateTicketState();
    };


    // Event Listeners para Ingressos
    document.querySelectorAll('.quantity-control button').forEach(button => {
        button.addEventListener('click', handleQuantityControl);
    });

    document.querySelectorAll('.quantity-control input').forEach(input => {
        input.addEventListener('change', updateTicketState);
    });

    updateTicketState(); // Inicializa o estado total na carga

    // 5. Finalização de Compra (Botão "Comprar")
    if (buyButton) { 
        buyButton.addEventListener('click', () => {
            updateTicketState(); // Garante o estado mais atualizado

            if (ticketState.total === 0) {
                showErrorMessage("Por favor, selecione pelo menos um ingresso para continuar.");
                return;
            }

            const userProfile = localStorage.getItem('userProfile'); 
            if (!userProfile) {
                alert("Você precisa estar logado para comprar ingressos.");
                window.location.href = '/login'; 
                return;
            }

            const currentOrder = {
                showId: showData.id,
                showTitle: showData.title,
                tickets: {
                    full: ticketState.full,
                    half: ticketState.half,
                    blocks: ticketState.blocks // Inclui blocks mesmo que seja 0
                },
                total: ticketState.total,
                priceDetails: ticketState.prices,
                orderDate: new Date().toISOString()
            };
            
            localStorage.setItem('currentOrder', JSON.stringify(currentOrder)); 
            window.location.href = '/pagamento';
        });
    }
});