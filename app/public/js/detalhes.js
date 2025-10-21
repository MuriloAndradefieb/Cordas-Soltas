

document.addEventListener('DOMContentLoaded', () => {
    let errorTimeout; 


    function showErrorMessage(message) {
        const errorMessageEl = document.getElementById('error-message');
        const buyButton = document.getElementById('buy-button');

        if (errorMessageEl && buyButton) {
            errorMessageEl.textContent = message;
            errorMessageEl.classList.add('visible');
            buyButton.classList.add('error-border'); 

            clearTimeout(errorTimeout);
            errorTimeout = setTimeout(() => {
                hideErrorMessage();
            }, 5000); 
        }
    }

    function hideErrorMessage() {
        const errorMessageEl = document.getElementById('error-message');
        const buyButton = document.getElementById('buy-button');
        if (errorMessageEl) {
            errorMessageEl.classList.remove('visible');
            errorMessageEl.textContent = ''; 
        }
        if (buyButton) {
            buyButton.classList.remove('error-border'); 
        }
        clearTimeout(errorTimeout); 
    }
    
    const hamburgerButton = document.querySelector('.hamburger-button'); 
    const sidebar = document.getElementById('sidebar-menu');           
    const overlay = document.getElementById('menu-overlay');             
    const closeMenuBtn = document.getElementById('close-menu-btn');    

    function toggleMenu() {
        if (sidebar && overlay) {
            const isMenuOpen = sidebar.classList.toggle('open');
            overlay.classList.toggle('open'); 
            document.body.style.overflow = isMenuOpen ? 'hidden' : ''; 
        }
    }

    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', toggleMenu);
    }
    
    if (closeMenuBtn) { 
        closeMenuBtn.addEventListener('click', toggleMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }

    const sidebarLinks = document.querySelectorAll('.sidebar-links a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar && sidebar.classList.contains('open')) {
                toggleMenu(); 
            }
        });
    });


    const showData = JSON.parse(localStorage.getItem('selectedShow'));

    if (!showData) {
        console.error("Dados do show não encontrados. O script de detalhes.ejs não pode ser executado.");
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

  
    const totalValueEl = document.getElementById('total-value');
    const buyButton = document.getElementById('buy-button'); 

    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    function updateTicketState() {
        const fullQty = parseInt(document.getElementById('qty-full')?.value) || 0;
        const halfQty = parseInt(document.getElementById('qty-half')?.value) || 0;
        ticketState.full = fullQty;
        ticketState.half = halfQty;
        ticketState.total = 
            (fullQty * ticketState.prices.full) +
            (halfQty * ticketState.prices.half);

        if (totalValueEl) {
            totalValueEl.textContent = formatCurrency(ticketState.total);
        }

        if (ticketState.total > 0) {
            hideErrorMessage();
        }
    }


    document.querySelectorAll('.quantity-control button').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            const input = document.getElementById(`qty-${type}`);
            
            if (input) {
                let currentValue = parseInt(input.value);
                const action = e.target.className.includes('plus') ? 1 : -1;
                
                currentValue = currentValue + action;
                if (currentValue < 0) currentValue = 0;
                

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



    if (buyButton) { 
        buyButton.addEventListener('click', () => {
            updateTicketState(); 

            if (ticketState.total === 0) {
                showErrorMessage("Por favor, selecione pelo menos um ingresso para continuar.");
                return;
            }

            const userProfile = localStorage.getItem('userProfile'); 

            if (!userProfile) {
                alert("Você precisa estar logado para comprar ingressos.");
                window.location.href = '/login'; // Redireciona para o login
                return;
            }

            const currentOrder = {
                showId: showData.id,
                showTitle: showData.title,
                tickets: {
                    full: ticketState.full,
                    half: ticketState.half,
                    blocks: ticketState.blocks
                },
                total: ticketState.total,
                priceDetails: ticketState.prices,
                orderDate: new Date().toISOString()
            };
            
            localStorage.setItem('currentOrder', JSON.stringify(currentOrder)); 
            window.location.href = '/pagamento';
        });
    }

    updateTicketState();
});