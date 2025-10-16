document.addEventListener('DOMContentLoaded', () => {
    // Busca o elemento do botão e da mensagem de erro
    const buyButton = document.getElementById('buy-luthbox-btn');
    const errorMessage = document.getElementById('error-message');
    
    // Tenta obter o perfil do usuário
    const userProfileString = localStorage.getItem('userProfile');
    let user = null;

    if (userProfileString) {
        user = JSON.parse(userProfileString);
    }
    
    // Lógica do botão "Comprar Seguro" (Restrição de Artista)
    if (buyButton) {
        
        buyButton.addEventListener('click', (event) => {
            // 1. Previne a navegação imediata do link
            event.preventDefault(); 
            
            // 2. Esconde a mensagem de erro antes de cada tentativa
            errorMessage.style.display = 'none';

            // 3. Verifica o perfil e o papel (role)
            // === CORREÇÃO CRUCIAL AQUI: Usando .toLowerCase() para garantir a comparação ===
            if (user && user.role && user.role.toLowerCase() === 'artista') {
                // SUCESSO: Artista logado
                window.location.href = '/luthbox-seguros';
                
            } else {
                // ERRO: Não-Artista ou Não Logado
                errorMessage.style.display = 'block';
                
                let message = 'Este serviço é exclusivo para **Artistas** e **Bandas**. Por favor, cadastre-se ou faça login com o perfil de Artista.';
                
                if (!user) {
                    // Não logado
                    message = 'Você precisa estar **logado** para prosseguir. A Luthbox é um seguro exclusivo para o perfil de Artista.';
                } else if (user.role.toLowerCase() === 'visitante') {
                    // Logado como Visitante
                     message = 'Sua conta é de **Visitante**. A Luthbox é um seguro exclusivo para o perfil de Artista.';
                }
                
                // Atualiza o conteúdo da mensagem
                errorMessage.innerHTML = message;
            }
        });
    }
});