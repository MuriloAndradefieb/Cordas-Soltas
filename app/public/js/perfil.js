document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. CONSTANTES E ESTADO INICIAL
    // =========================================================================
    const $ = id => document.getElementById(id);
    let user = JSON.parse(localStorage.getItem('userProfile')) || 
               { username: 'Convidado', email: '', password: '', role: 'Membro', phone: '' };
    
    const DOM = {
        // Seções
        actionsSection: $('actions'),
        alterarSenhaFormSection: $('alterar-senha-form'),
        editarPerfilFormSection: $('editar-perfil-form'),
        artistUpgradeSection: $('artist-upgrade-section'),
        
        // Exibição
        displayUsernameHeaderEl: $('display-username-header'),
        displayUsernameEl: $('display-username'),
        displayEmailEl: $('display-email'),
        displayRoleEl: $('display-role'),
        displayPasswordEl: $('display-password'),
        displayPhoneEl: $('display-phone'), 
        profileImageEl: $('profile-image'),
        
        // Formulário de Edição
        editUsernameInput: $('edit-username'),
        editEmailInput: $('edit-email'),
        editPhoneInput: $('edit-phone'), 
        newPasswordInput: $('new-password'),
        confirmPasswordInput: $('confirm-password'),
        
        // Ações/Botões
        editProfileBtn: $('edit-profile-btn'),
        changePasswordBtn: $('change-password-btn'),
        cancelProfileBtn: $('cancel-profile-btn'), 
        cancelPasswordBtn: $('cancel-password-btn'), 
        savePasswordBtn: $('save-password-btn'),
        saveProfileBtn: $('save-profile-btn'),
        editPhotoBtn: $('edit-photo-btn'),
        photoUploadInput: $('photo-upload'),
        upgradeToArtistBtn: $('upgrade-to-artist-btn'), 
        downgradeToMemberBtn: $('downgrade-to-member-btn'),
    };

    // =========================================================================
    // 2. MÓDULO DE UTILITÁRIOS
    // =========================================================================
    const Utils = {
        maskPhone: (value) => {
            value = value.replace(/\D/g, ''); 
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d)(\d{4})$/, '$1-$2');
            return value.substring(0, 15); 
        },
        saveUser: () => {
            localStorage.setItem('userProfile', JSON.stringify(user));
            Profile.loadUserProfile();
        },
        isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    };

    // =========================================================================
    // 3. MÓDULO DE INTERFACE E NAVEGAÇÃO
    // =========================================================================
    const UI = {
        hideAllForms: () => {
            DOM.alterarSenhaFormSection?.classList.add('hidden');
            DOM.editarPerfilFormSection?.classList.add('hidden');
        },

        showActionsSection: () => {
            // Limpa campos de senha ao cancelar
            DOM.newPasswordInput.value = '';
            DOM.confirmPasswordInput.value = '';

            DOM.actionsSection?.classList.remove('hidden');
            UI.hideAllForms();
            Profile.loadUserProfile(); // Recarrega para ajustar visibilidade de upgrade/downgrade
        },

        showChangePasswordForm: () => {
            DOM.actionsSection?.classList.add('hidden');
            DOM.alterarSenhaFormSection?.classList.remove('hidden');
            DOM.editarPerfilFormSection?.classList.add('hidden');
        },

        showEditProfileForm: () => {
            DOM.actionsSection?.classList.add('hidden');
            DOM.alterarSenhaFormSection?.classList.add('hidden');
            DOM.editarPerfilFormSection?.classList.remove('hidden');
            
            // Preenche os campos
            DOM.editUsernameInput.value = user.username || '';
            DOM.editEmailInput.value = user.email || '';
            // Aplica a máscara no valor do telefone
            DOM.editPhoneInput.value = user.phone ? Utils.maskPhone(user.phone) : '';
        },
    };

    // =========================================================================
    // 4. MÓDULO DE PERFIL (Lógica de Dados)
    // =========================================================================
    const Profile = {
        
        loadUserProfile: () => {
            if (user) {
                const phoneMasked = user.phone ? Utils.maskPhone(user.phone) : 'N/A';
                const isArtist = user.role && user.role.toLowerCase() === 'artista';

                // Atualiza elementos de exibição
                DOM.displayUsernameHeaderEl.textContent = user.username || 'Usuário Padrão';
                DOM.displayUsernameEl.textContent = user.username || 'N/A';
                DOM.displayEmailEl.textContent = user.email || 'N/A';
                DOM.displayRoleEl.textContent = user.role || 'Membro';
                DOM.displayPhoneEl.textContent = phoneMasked;
                DOM.displayPasswordEl.textContent = user.password ? '•'.repeat(user.password.length) : '••••••••';
                
                // Imagem de Perfil
                DOM.profileImageEl.src = user.profilePicture || "https://via.placeholder.com/150/000000/FFFFFF/?text=P";

                // Visibilidade dos botões de Role
                DOM.artistUpgradeSection?.classList.toggle('hidden', isArtist);
                DOM.downgradeToMemberBtn?.classList.toggle('hidden', !isArtist);
            }
        },

        handlePhotoUpload: (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                user.profilePicture = e.target.result;
                Utils.saveUser();
            };
            reader.readAsDataURL(file);
        },

        saveProfile: () => {
            const newUsername = DOM.editUsernameInput.value.trim();
            const newEmail = DOM.editEmailInput.value.trim();
            const newPhone = DOM.editPhoneInput.value.replace(/\D/g, ''); // Salva apenas dígitos

            if (!newUsername || !newEmail) {
                alert('Preencha nome de usuário e email.');
                return;
            }
            if (!Utils.isValidEmail(newEmail)) {
                alert('Por favor, insira um email válido.');
                return;
            }
            
            user.username = newUsername;
            user.email = newEmail;
            user.phone = newPhone;
            
            Utils.saveUser();
            alert('Perfil atualizado com sucesso!');
            UI.showActionsSection();
        },

        savePassword: () => {
            const newPassword = DOM.newPasswordInput.value;
            const confirmPassword = DOM.confirmPasswordInput.value;

            if (!newPassword || newPassword !== confirmPassword) {
                alert('As senhas não coincidem ou o campo está vazio.');
                return;
            }
            
            user.password = newPassword;
            Utils.saveUser(); 
            alert('Senha alterada com sucesso!');
            UI.showActionsSection();
        },

        upgradeRole: () => {
            if (confirm('Tem certeza que deseja mudar seu perfil para "Artista"?')) {
                user.role = 'Artista'; 
                // Limpa quaisquer dados específicos que possam entrar em conflito
                delete user.artistArea;
                delete user.socialLink;

                Utils.saveUser();
                alert('Parabéns! 🎉 Sua conta agora é "Artista". Bem-vindo(a)!');
            }
        },

        downgradeRole: () => {
            if (confirm('Tem certeza que deseja reverter para a conta "Membro"? Você perderá acesso às ferramentas de Artista.')) {
                // CORRIGIDO: O papel base é "Membro"
                user.role = 'Membro'; 
                
                // Limpa dados específicos de artista
                delete user.artistArea;
                delete user.socialLink;

                Utils.saveUser(); 
                alert('Seu perfil foi revertido para "Membro".');
            }
        },
    };

    // =========================================================================
    // 5. INICIALIZAÇÃO E BINDING DE EVENTOS
    // =========================================================================
    
    const bindEvents = () => {
        // Navegação de Formulários
        DOM.editProfileBtn?.addEventListener('click', UI.showEditProfileForm);
        DOM.changePasswordBtn?.addEventListener('click', UI.showChangePasswordForm);
        DOM.cancelProfileBtn?.addEventListener('click', UI.showActionsSection);
        DOM.cancelPasswordBtn?.addEventListener('click', UI.showActionsSection);

        // Ações de Salvar
        DOM.saveProfileBtn?.addEventListener('click', Profile.saveProfile);
        DOM.savePasswordBtn?.addEventListener('click', Profile.savePassword);
        
        // Foto
        DOM.editPhotoBtn?.addEventListener('click', () => DOM.photoUploadInput.click());
        DOM.photoUploadInput?.addEventListener('change', Profile.handlePhotoUpload);

        // Role (Upgrade/Downgrade)
        DOM.upgradeToArtistBtn?.addEventListener('click', Profile.upgradeRole);
        DOM.downgradeToMemberBtn?.addEventListener('click', Profile.downgradeRole);
        
        // Máscara de Telefone
        DOM.editPhoneInput?.addEventListener('input', (e) => {
            e.target.value = Utils.maskPhone(e.target.value);
        });
    };

    // Início da aplicação
    Profile.loadUserProfile(); 
    bindEvents();
});