    document.addEventListener('DOMContentLoaded', () => {

        const hamburgerButton = document.querySelector('.hamburger-button');
        const sidebar         = document.getElementById('sidebar-menu');
        const overlay         = document.getElementById('menu-overlay');
        const closeMenuBtn    = document.getElementById('close-menu-btn');

        function toggleMenu() {
            if (sidebar && overlay) {
                const isOpen = sidebar.classList.toggle('open');
                overlay.classList.toggle('open');
                document.body.style.overflow = isOpen ? 'hidden' : '';
            }
        }

        if (hamburgerButton) hamburgerButton.addEventListener('click', toggleMenu);
        if (closeMenuBtn)    closeMenuBtn.addEventListener('click', toggleMenu);
        if (overlay)         overlay.addEventListener('click', toggleMenu);

        document.querySelectorAll('.sidebar-links a').forEach(link => {
            link.addEventListener('click', () => {
                if (sidebar && sidebar.classList.contains('open')) toggleMenu();
            });
        });

        // ── Carrosséis ────────────────────────────────────────────────────────────
        function initCarousel(id) {
            const carousel = document.getElementById(id);
            if (!carousel) return;
            const wrap = carousel.parentElement;
            const prev = wrap.querySelector('.prev-btn');
            const next = wrap.querySelector('.next-btn');
            const step = 600;
            if (prev) prev.addEventListener('click', e => { e.preventDefault(); carousel.scrollBy({ left: -step, behavior: 'smooth' }); });
            if (next) next.addEventListener('click', e => { e.preventDefault(); carousel.scrollBy({ left:  step, behavior: 'smooth' }); });
        }

        ['rock-carousel','samba-carousel','pagode-carousel','jazz-carousel','popular-carousel','recent-carousel']
            .forEach(initCarousel);

        // ── Banner automático ─────────────────────────────────────────────────────
        const bannerEl = document.getElementById('auto-banner-carousel');
        if (bannerEl) {
            const slides = bannerEl.querySelectorAll('.banner-slide');
            if (slides.length > 1) {
                let cur = 0;
                setInterval(() => {
                    slides[cur].classList.remove('active');
                    cur = (cur + 1) % slides.length;
                    slides[cur].classList.add('active');
                }, 5000);
            }
        }

    });
    document.addEventListener("DOMContentLoaded", () => {
    const inputBusca = document.getElementById("input-busca");
    const selectEstilo = document.getElementById("filtro-estilo-select");
    
    // Classes do seu layout dinâmico
    const blocosEstilo = document.querySelectorAll(".bloco-estilo-musical"); 
    const cardsShows = document.querySelectorAll(".card-show"); 

    function aplicarFiltroSutil() {
        const termoBusca = inputBusca.value.toLowerCase().trim();
        const estiloSelecionado = selectEstilo.value;

        cardsShows.forEach(card => {
            const titulo = card.querySelector("h3")?.textContent.toLowerCase() || "";
            const local = card.querySelector("p")?.textContent.toLowerCase() || "";
            const estiloCard = card.getAttribute("data-estilo") || ""; 

            // Regras lógicas cruzadas (Busca por texto + Categoria selecionada no Select)
            const bateComEstilo = (estiloSelecionado === "todos" || estiloCard.toLowerCase() === estiloSelecionado.toLowerCase());
            const bateComTexto = (titulo.includes(termoBusca) || local.includes(termoBusca));

            if (bateComEstilo && bateComTexto) {
                card.style.display = ""; // Mantém o comportamento original (flex/grid)
            } else {
                card.style.display = "none";
            }
        });

        // Limpa blocos vazios da tela para manter o visual clean
        blocosEstilo.forEach(bloco => {
            const temCardsVisiveis = Array.from(bloco.querySelectorAll(".card-show")).some(card => card.style.display !== "none");
            bloco.style.display = temCardsVisiveis ? "" : "none";
        });
    }

    // Escuta eventos de digitação na busca e mudanças no select drop-down
    inputBusca.addEventListener("input", aplicarFiltroSutil);
    selectEstilo.addEventListener("change", aplicarFiltroSutil);
});
