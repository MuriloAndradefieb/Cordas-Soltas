
document.addEventListener('DOMContentLoaded', () => {
    

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

    const accountLink = document.getElementById('account-link');
    const userProfile = localStorage.getItem('userProfile');
    if (accountLink) {
        accountLink.href = userProfile ? '/perfil' : '/login';
    }

    function initializeCarousel(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        const container = carousel.parentElement;
        const prevBtn = container.querySelector('.prev-btn');
        const nextBtn = container.querySelector('.next-btn');
        const scrollStep = 600; 

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                carousel.scrollBy({ left: -scrollStep, behavior: 'smooth' });
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                carousel.scrollBy({ left: scrollStep, behavior: 'smooth' });
            });
        }
    }

    initializeCarousel('rock-carousel');
    initializeCarousel('samba-carousel');
    initializeCarousel('popular-carousel');
    initializeCarousel('recent-carousel');


    const bannerCarousel = document.getElementById('auto-banner-carousel');
    if (bannerCarousel) {
        const slides = bannerCarousel.querySelectorAll('.banner-slide');
        
        if (slides.length > 1) {
            let currentSlide = 0;
            const slideInterval = 5000;

            function nextSlide() {

                slides[currentSlide].classList.remove('active');
                

                currentSlide = (currentSlide + 1) % slides.length;


                slides[currentSlide].classList.add('active');
            }


            setInterval(nextSlide, slideInterval);
        }
    }
    
    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const createShowCard = (show) => {
        const link = `detalhes.ejs?id=${show.id}`;

        return `
            <a href="${link}" class="show-card">
                <img src="${show.image}" alt="${show.title}">
                <article class="card-info">
                    <span class="card-tag">${show.date}</span>
                    <h3>${show.title}</h3>
                    <p>${show.location}</p>
                    <p class="card-price-container">
                        <span>A partir de</span>
                        <span class="price-value">${formatCurrency(show.priceHalf)}</span>
                    </p>
                </article>
            </a>
        `;
    };

    function renderShows(containerId, filterFn) {
        const container = document.getElementById(containerId);
        if (!container || typeof shows === 'undefined') return;

        const filteredShows = shows.filter(filterFn).slice(0, 8); 

        container.innerHTML = filteredShows.map(createShowCard).join('');
    }

    try {
        renderShows('rock-carousel', show => show.title.toLowerCase().includes('rock'));
        renderShows('samba-carousel', show => show.title.toLowerCase().includes('samba') || show.title.toLowerCase().includes('pagode'));
        renderShows('popular-carousel', () => true); 
        renderShows('recent-carousel', () => true);  
    } catch (e) {
        console.warn("Aviso: Variável 'shows' não encontrada. A renderização de cards não será executada.", e);
    }
    
});