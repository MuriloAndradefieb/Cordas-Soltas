document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#form-add-admin');
    const btnCancel = document.querySelector('#btn-cancel');

    // Funcionalidade do botão Cancelar (Retorna para a listagem sem fazer nada)
    if (btnCancel) {
        btnCancel.addEventListener('click', (e) => {
            e.preventDefault();
            // Redireciona de volta para a tela de gerenciamento principal
            window.location.href = '/adm/acesso-direto';
        });
    }

    // Validações básicas de segurança antes de disparar o formulário para o Back-end
    if (form) {
        form.addEventListener('submit', (e) => {
            const senhaInput = document.querySelector('input[name="senha"]');
            const emailInput = document.querySelector('input[name="email"]');
            
            // Exemplo de validação de tamanho de senha no front-end
            if (senhaInput && senhaInput.value.length < 6) {
                e.preventDefault(); // Bloqueia o envio do formulário
                alert('Atenção: Por motivos de segurança, a senha deve conter no mínimo 6 caracteres.');
                senhaInput.focus();
                return;
            }

            console.log('🚀 Enviando dados de novo administrador para o servidor...');
        });
    }
});