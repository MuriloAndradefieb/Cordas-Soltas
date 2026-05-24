// public/js/admin-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    


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