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