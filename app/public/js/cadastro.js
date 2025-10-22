document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementos do Formulário
    const $ = id => document.getElementById(id); // Função auxiliar para obter elementos
    
    const cadastroForm = $('cadastro-form');
    const roleArtista = $('role-artista');
    const roleVisitante = $('role-visitante');
    const artistFieldsDiv = $('artist-fields');
    const usernameInput = $('username');
    const emailInput = $('email');
    const passwordInput = $('password');
    const bandNameInput = $('bandName');
    const musicalStyleInput = $('musicalStyle');
    const instagramInput = $('instagram');

    const inputsToValidate = [usernameInput, emailInput, passwordInput, bandNameInput, musicalStyleInput, instagramInput];

    // 2. Funções de Validação e Feedback
    
    // Valida se o email tem um formato básico
    const isValidEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };
    
    // Marca um campo como erro, exibindo a mensagem
    const markAsError = (input, message) => {
        const errorElement = $(input.id + '-error');
        input.classList.add('input-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    };

    // Remove o estado de erro de um campo
    const unmarkAsError = (input) => {
        const errorElement = $(input.id + '-error');
        input.classList.remove('input-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    };
    
    // Remove o estado de erro de todos os campos
    const clearErrors = () => {
        inputsToValidate.forEach(unmarkAsError);
    };

    // 3. Lógica para Exibir/Ocultar Campos de Artista
    
    const toggleArtistFields = () => {
        const isArtist = roleArtista.checked;
        if (isArtist) {
            artistFieldsDiv.classList.remove('hidden-fields');
            bandNameInput.setAttribute('required', 'required');
            musicalStyleInput.setAttribute('required', 'required');
        } else {
            artistFieldsDiv.classList.add('hidden-fields');
            bandNameInput.removeAttribute('required');
            musicalStyleInput.removeAttribute('required');
            // Remove erros de campos ocultados, caso existam
            unmarkAsError(bandNameInput);
            unmarkAsError(musicalStyleInput);
        }
    };

    // 4. Event Listeners para a alternância de função
    roleArtista.addEventListener('change', toggleArtistFields);
    roleVisitante.addEventListener('change', toggleArtistFields);
    toggleArtistFields(); // Executa ao carregar para o estado inicial

    // 5. Validação e Submissão do Formulário
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            let isValid = true;
            clearErrors(); // Limpa todos os erros antes de revalidar
            
            const roleInput = document.querySelector('input[name="role"]:checked');
            const isArtistRole = roleInput && roleInput.value.toLowerCase() === 'artista';

            // Validação de Campos Comuns
            if (usernameInput.value.trim() === '') {
                markAsError(usernameInput, 'O nome de usuário é obrigatório.');
                isValid = false;
            }

            if (emailInput.value.trim() === '') {
                markAsError(emailInput, 'O email é obrigatório.');
                isValid = false;
            } else if (!isValidEmail(emailInput.value.trim())) {
                markAsError(emailInput, 'Formato de email inválido.');
                isValid = false;
            }

            if (passwordInput.value.length < 6) {
                markAsError(passwordInput, 'A senha deve ter pelo menos 6 caracteres.');
                isValid = false;
            }

            // Validação Condicional (Apenas para Artista)
            if (isArtistRole) {
                if (bandNameInput.value.trim() === '') {
                    markAsError(bandNameInput, 'O nome da banda/projeto é obrigatório.');
                    isValid = false;
                }
                if (musicalStyleInput.value.trim() === '') {
                    markAsError(musicalStyleInput, 'O estilo musical é obrigatório.');
                    isValid = false;
                }
            }
            
            // Validação da Escolha de Perfil
            if (!roleInput && isValid) { // Verifica a função APÓS outras validações
                alert('Por favor, selecione seu tipo de conta (Artista ou Visitante) para prosseguir.');
                isValid = false;
            }

            // Submissão
            if (isValid) {
                const userProfileData = {
                    username: usernameInput.value,
                    email: emailInput.value,
                    password: passwordInput.value,
                    role: roleInput.value.toLowerCase()
                };

                if (userProfileData.role === 'artista') {
                    userProfileData.bandName = bandNameInput.value;
                    userProfileData.musicalStyle = musicalStyleInput.value;
                    userProfileData.instagram = instagramInput.value; // Pode estar vazio
                }

                // Simulação de Submissão (Usando LocalStorage)
                localStorage.setItem('userProfile', JSON.stringify(userProfileData));
                alert('Cadastro realizado com sucesso! Agora faça o login.');
                window.location.href = '/login';
            }
        });
    }
});