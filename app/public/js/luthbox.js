document.addEventListener('DOMContentLoaded', () => {
    const buyButton    = document.getElementById('buy-luthbox-btn');
    const errorMessage = document.getElementById('error-message');

    // usuarioLogado e usuarioRole são injetados pelo luthbox.ejs via <script> inline
    if (buyButton) {
        buyButton.addEventListener('click', (event) => {
            event.preventDefault();
            errorMessage.style.display = 'none';

            if (!usuarioLogado) {
                errorMessage.innerHTML = 'Você precisa estar <strong>logado</strong> para prosseguir. A Luthbox é exclusiva para Artistas.';
                errorMessage.style.display = 'block';
                return;
            }

            if (usuarioRole === 'artista') {
                window.location.href = '/luthbox-seguros';
            } else {
                errorMessage.innerHTML = 'Sua conta é de <strong>Visitante</strong>. A Luthbox é exclusiva para o perfil de Artista.';
                errorMessage.style.display = 'block';
            }
        });
    }
});