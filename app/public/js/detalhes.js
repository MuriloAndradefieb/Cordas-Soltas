// Arquivo: detalhes.js (CORRIGIDO)

document.addEventListener('DOMContentLoaded', () => {
    let errorTimeout; // Variável para controlar o timeout da mensagem de erro

    // Função para exibir a mensagem de erro
    function showErrorMessage(message) {
        const errorMessageEl = document.getElementById('error-message');
        const buyButton = document.getElementById('buy-button');

        if (errorMessageEl && buyButton) {
            errorMessageEl.textContent = message;
            errorMessageEl.classList.add('visible'); // Mostra a mensagem
            buyButton.classList.add('error-border'); // Adiciona a borda vermelha

            // Limpa qualquer timeout anterior para reiniciar a contagem
            clearTimeout(errorTimeout);
            // Oculta a mensagem e a borda após 5 segundos
            errorTimeout = setTimeout(() => {
                hideErrorMessage();
            }, 5000); 
        }
    }

    // Função para ocultar a mensagem de erro
    function hideErrorMessage() {
        const errorMessageEl = document.getElementById('error-message');
        const buyButton = document.getElementById('buy-button');
        if (errorMessageEl) {
            errorMessageEl.classList.remove('visible');
            errorMessageEl.textContent = ''; // Limpa o texto
        }
        if (buyButton) {
            buyButton.classList.remove('error-border'); // Remove a borda vermelha
        }
        clearTimeout(errorTimeout); // Garante que o timeout é limpo
    }
    
    // Selecionadores para o menu (usam tags semânticas: button, aside e section)
    const hamburgerButton = document.querySelector('.hamburger-button'); // Botão de abrir
    const sidebar = document.getElementById('sidebar-menu');           // O menu lateral (tag <aside>)
    const overlay = document.getElementById('menu-overlay');             // A camada escura (tag <section>)
    const closeMenuBtn = document.getElementById('close-menu-btn');    // Botão de fechar

    function toggleMenu() {
        if (sidebar && overlay) {
            const isMenuOpen = sidebar.classList.toggle('open');
            
            // Usa a classe 'open' em ambos
            overlay.classList.toggle('open'); 

            // Bloqueia ou libera o scroll do corpo da página
            document.body.style.overflow = isMenuOpen ? 'hidden' : ''; 
        }
    }

    // Adiciona os event listeners (ESTES JÁ ESTAVAM CORRETOS E FUNCIONAIS)
    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', toggleMenu);
    }
    
    if (closeMenuBtn) { 
        closeMenuBtn.addEventListener('click', toggleMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }

    // Fechar menu ao clicar em um link
    const sidebarLinks = document.querySelectorAll('.sidebar-links a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar && sidebar.classList.contains('open')) {
                toggleMenu(); 
            }
        });
    });


    // ***********************************************
    // A LÓGICA ABAIXO FOI MOVIDA PARA FORA DO setTimeout(..., 0)
    // ***********************************************
    
    // 1. Variáveis de Estado
    const showData = JSON.parse(localStorage.getItem('selectedShow'));

    if (!showData) {
        console.error("Dados do show não encontrados. O script de detalhes.ejs não pode ser executado.");
        return; 
    }

    // Estado do carrinho de ingressos
    const ticketState = {
        full: 0,
        half: 0,
        blocks: 0,
        total: 0, // Total em R$
        prices: {
            full: showData.priceFull,
            half: showData.priceHalf,
            blocks: showData.priceBlocks
        }
    };

    // Elementos do DOM
    const totalValueEl = document.getElementById('total-value');
    const buyButton = document.getElementById('buy-button'); 

    // Função utilitária de formatação
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // 2. Função de Atualização
    function updateTicketState() {
        const fullQty = parseInt(document.getElementById('qty-full')?.value) || 0;
        const halfQty = parseInt(document.getElementById('qty-half')?.value) || 0;
        // const blocksQty = parseInt(document.getElementById('qty-blocks')?.value) || 0; // Descomente se tiver blocos

        ticketState.full = fullQty;
        ticketState.half = halfQty;
        // ticketState.blocks = blocksQty; // Descomente se tiver blocos

        // Cálculo do total
        ticketState.total = 
            (fullQty * ticketState.prices.full) +
            (halfQty * ticketState.prices.half);
            // + (blocksQty * ticketState.prices.blocks); // Descomente se tiver blocos

        // Atualiza o display do total
        if (totalValueEl) {
            totalValueEl.textContent = formatCurrency(ticketState.total);
        }

        // Se o usuário selecionou ingressos, esconde a mensagem de erro
        if (ticketState.total > 0) {
            hideErrorMessage();
        }
    }

    // 3. Gerenciamento de Quantidade (Botões +/- e Inputs)
    document.querySelectorAll('.quantity-control button').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            const input = document.getElementById(`qty-${type}`);
            
            if (input) {
                let currentValue = parseInt(input.value);
                const action = e.target.className.includes('plus') ? 1 : -1;
                
                currentValue = currentValue + action;
                if (currentValue < 0) currentValue = 0;
                
                // Limita a quantidade (Exemplo: 10 ingressos por tipo)
                const maxQty = type === 'blocks' ? 5 : 10;
                if (currentValue > maxQty) currentValue = maxQty;

                input.value = currentValue;
                updateTicketState();
            }
        });
    });

    document.querySelectorAll('.quantity-control input').forEach(input => {
        input.addEventListener('change', updateTicketState);
    });


    // 4. Lógica do Botão de Comprar (VALIDAÇÃO E REDIRECIONAMENTO)
    if (buyButton) { 
        buyButton.addEventListener('click', () => {
            updateTicketState(); // Garante que o total está atualizado

            // Checa se o usuário selecionou algum ingresso
            if (ticketState.total === 0) {
                // *** MUDANÇA AQUI: Usa a função de erro sutil ***
                showErrorMessage("Por favor, selecione pelo menos um ingresso para continuar.");
                return;
            }

            // Validação de Login
            const userProfile = localStorage.getItem('userProfile'); 

            if (!userProfile) {
                // Mantém o alert para login (ou você pode mudar este também para uma mensagem na página)
                alert("Você precisa estar logado para comprar ingressos.");
                window.location.href = '/login'; // Redireciona para o login
                return;
            }

            // Usuário logado e ingressos selecionados: Salva o pedido e redireciona
            const currentOrder = {
                showId: showData.id,
                showTitle: showData.title,
                tickets: {
                    full: ticketState.full,
                    half: ticketState.half,
                    blocks: ticketState.blocks // Descomente se tiver blocos
                },
                total: ticketState.total,
                priceDetails: ticketState.prices,
                orderDate: new Date().toISOString()
            };
            
            localStorage.setItem('currentOrder', JSON.stringify(currentOrder)); 
            // REDIRECIONAMENTO PARA PAGAMENTOS
            window.location.href = '/pagamento';
        });
    }

    // Inicialização do estado
    updateTicketState();
});