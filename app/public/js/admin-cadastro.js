document.addEventListener('DOMContentLoaded', () => {
    
    // Captura cliques nos botões de engrenagem (Ações)
    const actionButtons = document.querySelectorAll('.btn-action');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Recupera o e-mail atrelado ao botão clicado através do data-attribute
            const email = event.currentTarget.getAttribute('data-email');
            alert(`Abrindo configurações para o usuário: ${email}`);
        });
    });

    // Captura clique no botão de Adicionar
    const btnAdd = document.getElementById('btn-add-cadastro');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            alert('Redirecionando para a tela de novo cadastro...');
            // Exemplo de redirecionamento futuro:
            // window.location.href = '/adm/cadastro/adicionar';
        });
    }
});