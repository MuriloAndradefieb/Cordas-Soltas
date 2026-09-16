const estilosData = {
    'rock': {
        title: 'Rock - Equipamentos',
        cardTitle: 'Pacote Rock',
        imageSrc: 'img/luthrock.jpg',
        imageAlt: 'Setup completo para Rock: Bateria, Guitarras, Amplificadores e Microfones.',
        caption: 'Equipamento essencial para o som pesado do Rock.',
        description: 'Kit de instrumentos para manter o show de Rock pronto mesmo em emergências:',
        items: [
            '1x Bateria',
            '3x Guitarras',
            '2x Microfones',
            '2x Caixas de som'
        ],
        price: '45.00'
    },
    'samba': {
        title: 'Samba - Equipamentos',
        cardTitle: 'Pacote Samba',
        imageSrc: 'img/luthsamba.webp',
        imageAlt: 'Setup de percussão para Samba: Pandeiro, Surdo, Agogô e Reco-reco.',
        caption: 'O kit de percussão que é a alma da Roda de Samba.',
        description: 'Kit de apoio para a roda continuar com base, harmonia e percussão:',
        items: [
            '1x Surdo',
            '1x Repinique',
            '1x Tantã',
            '1x Pandeiro',
            '1x Banjo',
            '1x Cavaquinho'
        ],
        price: '45.00'
    },
    'pagode': {
        title: 'Pagode - Equipamentos',
        cardTitle: 'Kit Pagode Completo',
        imageSrc: 'img/luthpagode.webp',
        imageAlt: 'Setup para Pagode com Tantan, Violão e Cavaquinho.',
        caption: 'Instrumentos de corda e percussão para o Pagode moderno.',
        description: 'Kit de instrumentos para sustentar a levada do Pagode sem perder o tempo:',
        items: [
            '1x Surdo',
            '1x Agogô',
            '2x Pandeiro',
            '1x Tamborim',
            '1x Reco-reco'
        ],
        price: '45.00'
    },
    'eletronica': {
        title: 'Eletrônica - Equipamentos',
        cardTitle: 'Mesa DJ EDM e Produção',
        imageSrc: 'img/lutheletronica.webp',
        imageAlt: 'Setup de música eletrônica com controladora de DJ e sintetizadores.',
        caption: 'Tecnologia e inovação para criação e performance.',
        description: 'Kit de apoio para sets, mixagens e apresentações eletrônicas:',
        items: [
            '1x Mesa Dj',
            '1x Microfone',
            '2x Mesa de som 12 canais'
        ],
        price: '45.00'
    },
    'jazz': {
        title: 'Jazz - Equipamentos',
        cardTitle: 'Pacote Jazz',
        imageSrc: 'img/luthjazz.jpg',
        imageAlt: 'Setup de Jazz com Saxofone, Trompete, Piano, Contrabaixo e Bateria.',
        caption: 'Instrumentos icônicos para a arte da improvisação.',
        description: 'Kit de instrumentos para preservar a harmonia e a improvisação no palco:',
        items: [
            '1x Violino',
            '1x Saxofone',
            '1x Violão',
            '1x Teclado',
            '1x Guitarra'
        ],
        price: '45.00'
    }
};

const mainContent = document.getElementById('main-content');


function setupBuyButtonListener(data) {
    const buyButton = document.querySelector('.botao-prosseguir');

    if (buyButton) {
        buyButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            const productTitle = buyButton.getAttribute('data-title');
            const productPrice = buyButton.getAttribute('data-price');
            
            const orderData = {
                title: productTitle || 'Kit de Instrumentos',
                total: parseFloat(productPrice) || 150.00,
                quantity: 1,
                source: 'luthbox',
                description: data.description,
                items: data.items
            };
            localStorage.setItem('currentOrder', JSON.stringify(orderData));

            window.location.href = '/pagamento-luth'; 
        });
    }
}

function renderizarEstilo(estiloKey) {
    const data = estilosData[estiloKey];
    if (!data) return;


    const itemsHtml = data.items.map(item => `<li>${item}</li>`).join('');
    const html = `
        <section class="details-and-back-container luth-details-container">
            <a href="/luthbox-seguros" class="back-link">&larr; Voltar para Luthbox</a>

            <article class="show-details-container luth-product-details">
                <section class="show-image-wrapper">
                    <img src="${data.imageSrc}" alt="${data.imageAlt}" class="show-image">
                </section>

                <section class="show-info-wrapper">
                    <header class="show-info">
                        <h1>${data.cardTitle}</h1>
                        <p><span class="detail-meta-icon genre" aria-hidden="true"></span>Categoria: <strong>${data.title.replace(' - Equipamentos', '')}</strong></p>
                        <p><span class="detail-meta-icon place" aria-hidden="true"></span>${data.caption}</p>
                    </header>

                    <section class="purchase-section">
                        <section class="ticket-option luth-kit-option">
                            <section class="ticket-name">
                                <h3>Aluguel do kit</h3>
                                <span class="ticket-price">R$ ${data.price.replace('.', ',')}</span>
                            </section>
                        </section>

                        <section class="luth-kit-description">
                            <p>${data.description}</p>
                            <ul>${itemsHtml}</ul>
                        </section>

                        <section class="total-summary">
                            <h3>Total:</h3>
                            <span class="total-price">R$ ${data.price.replace('.', ',')}</span>
                        </section>

                        <a href="/pagamento-luth"
                           class="buy-button botao-prosseguir"
                           data-title="${data.cardTitle}"
                           data-price="${data.price}">
                           ALUGAR
                        </a>
                    </section>
                </section>
            </article>
        </section>
    `;

    mainContent.innerHTML = html;
    document.title = `Luthbox - ${data.title.split(' ')[0]}`;
    setupBuyButtonListener(data);
}


function carregarEstiloInicial() {
    const params = new URLSearchParams(window.location.search);
    const estiloParam = params.get('estilo');
    
    const estiloInicial = estiloParam && estilosData[estiloParam] ? estiloParam : 'rock';
    
    renderizarEstilo(estiloInicial);
}

document.addEventListener('DOMContentLoaded', () => {
    carregarEstiloInicial();
});
