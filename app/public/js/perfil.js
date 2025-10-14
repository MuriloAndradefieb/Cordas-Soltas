document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 0. VERIFICAÇÃO DE SEGURANÇA E CARREGAMENTO INICIAL
    // ----------------------------------------------------
    let user = null;
    try {
        const userProfileString = localStorage.getItem('userProfile');
        if (!userProfileString) {
            // Se não houver perfil salvo, redireciona para a página de login
            window.location.href = '/login';
            return; // Interrompe a execução do script
        }
        user = JSON.parse(userProfileString);
    } catch (e) {
        console.error("Erro ao carregar ou fazer parse do perfil:", e);
        // Se houver erro de parse, trata como não logado
        localStorage.removeItem('userProfile');
        window.location.href = '/login';
        return;
    }
    
    // ----------------------------------------------------
    // 1. MAPEAMENTO DE ELEMENTOS
    // ----------------------------------------------------
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const alterarSenhaFormSection = document.getElementById('alterar-senha-form');
    const editarPerfilFormSection = document.getElementById('editar-perfil-form');
    const actionsSection = document.getElementById('actions');
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const displayUsernameHeaderEl = document.getElementById('display-username-header');
    const displayUsernameEl = document.getElementById('display-username');
    const displayEmailEl = document.getElementById('display-email');
    const displayRoleEl = document.getElementById('display-role');
    const displayPasswordEl = document.getElementById('display-password');
    const profileImageEl = document.getElementById('profile-image');
    const displayPhoneEl = document.getElementById('display-phone'); 
    const editUsernameInput = document.getElementById('edit-username');
    const editEmailInput = document.getElementById('edit-email');
    const editPhoneInput = document.getElementById('edit-phone'); 
    const savePasswordBtn = document.getElementById('save-password-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const editPhotoBtn = document.getElementById('edit-photo-btn');
    const logoutLink = document.querySelector('.logout-link');

    // ----------------------------------------------------
    // 2. UTILITÁRIOS (MÁSCARA E PERSISTÊNCIA)
    // ----------------------------------------------------
    function maskPhone(value) {
        value = value.replace(/\D/g, ''); 
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        return value.substring(0, 15); 
    }
    
    function saveUser() {
        localStorage.setItem('userProfile', JSON.stringify(user));
    }

    // ----------------------------------------------------
    // 3. FUNÇÕES DE VISUALIZAÇÃO E RENDERIZAÇÃO
    // ----------------------------------------------------
    function showActionsSection() {
        // Limpa campos de senha ao cancelar
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        actionsSection.classList.remove('hidden');
        alterarSenhaFormSection.classList.add('hidden');
        editarPerfilFormSection.classList.add('hidden');
    }

    function showChangePasswordForm() {
        actionsSection.classList.add('hidden');
        alterarSenhaFormSection.classList.remove('hidden');
        editarPerfilFormSection.classList.add('hidden');
    }

    function showEditProfileForm() {
        actionsSection.classList.add('hidden');
        alterarSenhaFormSection.classList.add('hidden');
        editarPerfilFormSection.classList.remove('hidden');
        
        // Preenche os campos do formulário
        editUsernameInput.value = user.username || '';
        editEmailInput.value = user.email || '';
        editPhoneInput.value = user.phone ? maskPhone(user.phone) : '';
    }
    
    function loadUserProfile() {
        // Exibição dos dados na tela principal
        displayUsernameHeaderEl.textContent = user.username || 'Usuário Padrão';
        displayUsernameEl.textContent = user.username || 'N/A';
        displayEmailEl.textContent = user.email || 'N/A';
        displayRoleEl.textContent = user.role || 'Membro';
        displayPhoneEl.textContent = user.phone ? maskPhone(user.phone) : 'N/A';
        // A senha só é exibida como pontos
        displayPasswordEl.textContent = user.password ? '•'.repeat(user.password.length) : '••••••••';
        
        // Carrega a imagem do perfil
        if (user.profilePicture) {
            profileImageEl.src = user.profilePicture;
        } else {
            const initial = (user.username && user.username.length > 0) ? user.username.charAt(0).toUpperCase() : 'P';
            profileImageEl.src = `https://via.placeholder.com/150/000000/FFFFFF/?text=${initial}`;
        }
    }

    // ----------------------------------------------------
    // 4. EVENT LISTENERS
    // ----------------------------------------------------
    
    // Alternância de Formulários
    editProfileBtn.addEventListener('click', showEditProfileForm);
    changePasswordBtn.addEventListener('click', showChangePasswordForm);
    cancelProfileBtn.addEventListener('click', showActionsSection);
    cancelPasswordBtn.addEventListener('click', showActionsSection);

    // Salvar Perfil
    saveProfileBtn.addEventListener('click', () => {
        const newUsername = editUsernameInput.value.trim();
        const newEmail = editEmailInput.value.trim();
        // Remove a máscara antes de salvar o número puro
        const newPhone = editPhoneInput.value.replace(/\D/g, ''); 

        if (newUsername && newEmail) {
            user.username = newUsername;
            user.email = newEmail;
            user.phone = newPhone;
            
            saveUser();
            
            loadUserProfile(); 
            alert('Perfil atualizado com sucesso! ✅');
            showActionsSection(); 
        } else {
            alert('Preencha nome de usuário e email.');
        }
    });

    // Salvar Senha
    savePasswordBtn.addEventListener('click', () => {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword.length < 6) {
             alert('A nova senha deve ter no mínimo 6 caracteres.');
             return;
        }

        if (newPassword && newPassword === confirmPassword) {
            user.password = newPassword; // Apenas para simulação de front-end
            saveUser();
            
            loadUserProfile(); 
            alert('Senha alterada com sucesso! 🔒');
            showActionsSection(); 
        } else {
            alert('As senhas não coincidem ou o campo está vazio.');
        }
    });

    // Máscara de Telefone em tempo real
    editPhoneInput.addEventListener('input', (e) => {
        e.target.value = maskPhone(e.target.value);
    });
    
    // Upload de Foto
    editPhotoBtn.addEventListener('click', () => {
        photoUploadInput.click();
    });

    photoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            user.profilePicture = e.target.result; // Salva Base64
            saveUser();
            loadUserProfile(); 
        };
        reader.readAsDataURL(file);
    });
    
    // Sair (Logout)
    logoutLink.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('userProfile');
        window.location.href = '/sair';
    });

    // ----------------------------------------------------
    // 5. CHAMADA DE INICIALIZAÇÃO
    // ----------------------------------------------------
    loadUserProfile(); 
});