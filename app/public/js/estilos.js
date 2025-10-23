const estilosData = {
    'rock': {
        title: 'Rock - Equipamentos',
        cardTitle: 'Pacote Rock',
        imageSrc: 'img/luthrock.jpg',
        imageAlt: 'Setup completo para Rock: Bateria, Guitarras, Amplificadores e Microfones.',
        caption: 'Equipamento essencial para o som pesado do Rock.',
        description: 'O kit de instrumentos ideal para a banda de Rock que procura o som clássico e potente:',
        items: [
            '1. Bateria (Completa, acústica ou eletrônica)',
            '2. Guitarra Elétrica (Clássica do Rock)',
            '3. Baixo Elétrico (Para a fundação rítmica)',
            '4. Amplificadores de Guitarra e Baixo',
            '5. Microfones (Vocais e Bateria)',
            '6. Cabos e Pedais de Efeito (Distortion/Overdrive)'
        ],
        price: '150.00'
    },
    'samba': {
        title: 'Samba - Equipamentos',
        cardTitle: 'Pacote Samba',
        imageSrc: 'img/luthsamba.webp',
        imageAlt: 'Setup de percussão para Samba: Pandeiro, Surdo, Agogô e Reco-reco.',
        caption: 'O kit de percussão que é a alma da Roda de Samba.',
        description: 'Ritmo e tradição com os instrumentos que dão o toque especial ao Samba de Raiz:',
        items: [
            '1. Surdo (Marcação grave do tempo)',
            '2. Pandeiro (Instrumento símbolo do Samba)',
            '3. Tamborim (Para os contratempos)',
            '4. Cavaquinho (Harmonia e solado melódico)',
            '5. Violão (Base harmônica)',
            '6. Reco-reco e Agogô (Cores e texturas rítmicas)'
        ],
        price: '150.00' 
    },
    'pagode': {
        title: 'Pagode - Equipamentos',
        cardTitle: 'Kit Pagode Completo',
        imageSrc: 'img/luthpagode.webp',
        imageAlt: 'Setup para Pagode com Tantan, Violão e Cavaquinho.',
        caption: 'Instrumentos de corda e percussão para o Pagode moderno.',
        description: 'O conjunto perfeito de instrumentos que define o Pagode contemporâneo:',
        items: [
            '1. Cavaquinho (O instrumento principal, melódico e rítmico)',
            '2. Violão de 6 ou 7 cordas (Base harmônica)',
            '3. Tan-Tan (Marcação de tempo fundamental)',
            '4. Rebolo (Percussão de som médio-grave)',
            '5. Pandeiro e Tamborim (Ritmo e contratempo)',
            '6. Banjo (Comum em subgêneros)'
        ],
        price: '150.00'
    },
    'eletronica': {
        title: 'Eletrônica - Equipamentos',
        cardTitle: 'Mesa DJ EDM e Produção',
        imageSrc: 'img/lutheletronica.webp',
        imageAlt: 'Setup de música eletrônica com controladora de DJ e sintetizadores.',
        caption: 'Tecnologia e inovação para criação e performance.',
        description: 'Equipamento moderno para criar batidas, mixar e manipular sons eletrônicos:',
        items: [
            '1. Controladora MIDI / Mesa de DJ (Mixagem e scratch)',
            '2. Sintetizadores (Para criação de texturas e timbres)',
            '3. Sampler e Caixa de Ritmos (Sequenciamento de batidas)',
            '4. Fones de Ouvido (Monitoramento de alta fidelidade)',
            '5. Monitores de Estúdio (Para mixagem e masterização)',
            '6. Controladores MIDI Adicionais (Pads, knobs, etc.)'
        ],
        price: '150.00'
    },
    'jazz': {
        title: 'Jazz - Equipamentos',
        cardTitle: 'Pacote Jazz',
        imageSrc: 'img/luthjazz.jpg',
        imageAlt: 'Setup de Jazz com Saxofone, Trompete, Piano, Contrabaixo e Bateria.',
        caption: 'Instrumentos icônicos para a arte da improvisação.',
        description: 'O conjunto de instrumentos essenciais para a harmonia e o swing do Jazz:',
        items: [
            '1. Saxofone (Alto ou Tenor - Essencial para solos)',
            '2. Trompete ou Trombone (Para a linha de frente)',
            '3. Piano ou Teclado (Base harmônica e acompanhamento)',
            '4. Contrabaixo Acústico (Para o walking bass)',
            '5. Bateria (Minimalista, focada no ride/chimbal)',
            '6. Guitarra (Semi-acústica, para acordes e solos limpos)'
        ],
        price: '150.00'
    }
};

const mainContent = document.getElementById('main-content');


function setupBuyButtonListener() {
    const buyButton = document.querySelector('.botao-prosseguir');

    if (buyButton) {
        buyButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            const productTitle = buyButton.getAttribute('data-title');
            const productPrice = buyButton.getAttribute('data-price');
            
            const orderData = {
                title: productTitle || 'Kit de Instrumentos',
                total: parseFloat(productPrice) || 150.00,
                quantity: 1 
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
        <article class="equipamento-section">
            <header>
                <h1>${data.title}</h1>
            </header>
            
            <section class="equipamento-card">
                <h2>${data.cardTitle}</h2>
                <figure>
                    <img src="${data.imageSrc}" alt="${data.imageAlt}">
                    <figcaption>${data.caption}</figcaption>
                </figure>
                
                <p>${data.description}</p>
                
                <ul>
                    ${itemsHtml}
                </ul>
                
                <p class="preco">A partir de: R$${data.price.replace('.', ',')}</p>
                
                <a href="pagamento.ejs" 
                   class="botao-prosseguir" 
                   data-title="${data.cardTitle}" 
                   data-price="${data.price}">
                   PROSSEGUIR
                </a>
            </section>
        </article>
    `;

    mainContent.innerHTML = html;
    document.title = `Luthbox - ${data.title.split(' ')[0]}`;
    setupBuyButtonListener();
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