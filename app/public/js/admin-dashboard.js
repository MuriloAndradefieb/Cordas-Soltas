// public/js/admin-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    
    // Captura o clique no botão "+ Adicionar"
    const btnAdd = document.querySelector('.btn-add');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            alert('Funcionalidade para adicionar novo administrador será aberta aqui!');
            // Aqui você pode abrir um modal ou redirecionar para a rota de cadastro
        });
    }

    // Captura cliques nos botões de ação (editar/configurar administrador)
    const actionButtons = document.querySelectorAll('.btn-action');
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const email = row.querySelector('.email-link').textContent;
            alert('Configurando ações para o administrador: ' + email);
        });
    });
});