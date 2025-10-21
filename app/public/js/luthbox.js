document.addEventListener('DOMContentLoaded', () => {
    const buyButton = document.getElementById('buy-luthbox-btn');
    const errorMessage = document.getElementById('error-message');
    const userProfileString = localStorage.getItem('userProfile');
    let user = null;

    if (userProfileString) {
        user = JSON.parse(userProfileString);
    }
    
    if (buyButton) {
        
        buyButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            
            errorMessage.style.display = 'none';
            if (user && user.role && user.role.toLowerCase() === 'artista') {
                window.location.href = '/luthbox-seguros';
                
            } else {
                errorMessage.style.display = 'block';
                
                let message = 'Este serviço é exclusivo para **Artistas** e **Bandas**. Por favor, cadastre-se ou faça login com o perfil de Artista.';
                
                if (!user) {
                    message = 'Você precisa estar **logado** para prosseguir. A Luthbox é um seguro exclusivo para o perfil de Artista.';
                } else if (user.role.toLowerCase() === 'visitante') {
                     message = 'Sua conta é de **Visitante**. A Luthbox é um seguro exclusivo para o perfil de Artista.';
                }
                errorMessage.innerHTML = message;
            }
        });
    }
});