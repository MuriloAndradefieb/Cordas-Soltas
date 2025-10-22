document.addEventListener('DOMContentLoaded', () => {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const alterarSenhaFormSection = document.getElementById('alterar-senha-form');
    const editarPerfilFormSection = document.getElementById('editar-perfil-form');
    const actionsSection = document.getElementById('actions');

    // Botões de Cancelar
    const cancelProfileBtn = document.getElementById('cancel-profile-btn'); 
    const cancelPasswordBtn = document.getElementById('cancel-password-btn'); 

    // Elementos de Exibição
    const displayUsernameHeaderEl = document.getElementById('display-username-header');
    const displayUsernameEl = document.getElementById('display-username');
    const displayEmailEl = document.getElementById('display-email');
    const displayRoleEl = document.getElementById('display-role');
    const displayPasswordEl = document.getElementById('display-password');
    const profileImageEl = document.getElementById('profile-image');
    const displayPhoneEl = document.getElementById('display-phone'); 

    // Elementos do Formulário de Edição
    const editUsernameInput = document.getElementById('edit-username');
    const editEmailInput = document.getElementById('edit-email');
    const editPhoneInput = document.getElementById('edit-phone'); 

    // Botões de Salvar
    const savePasswordBtn = document.getElementById('save-password-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    
    // Elementos da Foto
    const photoUploadInput = document.getElementById('photo-upload');
    const editPhotoBtn = document.getElementById('edit-photo-btn');

    // Elementos de Upgrade/Downgrade
    const upgradeToArtistBtn = document.getElementById('upgrade-to-artist-btn'); 
    const artistUpgradeSection = document.getElementById('artist-upgrade-section'); 
    const downgradeToMemberBtn = document.getElementById('downgrade-to-member-btn');
    

    let user = JSON.parse(localStorage.getItem('userProfile'));
    
    // Se o usuário não existir, cria um objeto base para evitar erros
    if (!user) {
        user = { username: 'Convidado', email: '', password: '', role: 'Membro', phone: '' };
    }

    // === UTILITÁRIO DE MÁSCARA ===
    
    function maskPhone(value) {
        value = value.replace(/\D/g, ''); 
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        return value.substring(0, 15); 
    }

    // === FUNÇÕES DE VISUALIZAÇÃO ===
    
    function showActionsSection() {
        // Redefine os campos de senha quando cancela
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        actionsSection.classList.remove('hidden');
        alterarSenhaFormSection.classList.add('hidden');
        editarPerfilFormSection.classList.add('hidden');
       
        // Recarrega o perfil para reavaliar se a seção de upgrade/downgrade deve aparecer
        loadUserProfile(); 
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
        
        // Preenche os campos do formulário com os dados atuais
        editUsernameInput.value = user.username || '';
        editEmailInput.value = user.email || '';
        editPhoneInput.value = user.phone ? maskPhone(user.phone) : '';
    }
    
    // Função para carregar os dados do usuário
    function loadUserProfile() {
        if (user) {
            displayUsernameHeaderEl.textContent = user.username || 'Usuário Padrão';
            displayUsernameEl.textContent = user.username || 'N/A';
            displayEmailEl.textContent = user.email || 'N/A';
            displayRoleEl.textContent = user.role || 'Membro';
            displayPhoneEl.textContent = user.phone ? maskPhone(user.phone) : 'N/A';
            displayPasswordEl.textContent = user.password ? '•'.repeat(user.password.length) : '••••••••';
            
            // Carrega a imagem do perfil
            if (user.profilePicture) {
                profileImageEl.src = user.profilePicture;
            } else {
                profileImageEl.src = "https://via.placeholder.com/150/000000/FFFFFF/?text=P";
            }

            // Lógica de visibilidade do botão de upgrade/downgrade 
            const isArtist = user.role && user.role.toLowerCase() === 'artista';

            if (artistUpgradeSection) {
                // Mostra o botão de UPGRADE se NÃO for artista
                if (isArtist) {
                    artistUpgradeSection.classList.add('hidden'); 
                } else {
                    artistUpgradeSection.classList.remove('hidden'); 
                }
            }

            // Lógica para o botão de DOWNGRADE
            if (downgradeToMemberBtn) {
                // Mostra o botão de DOWNGRADE se FOR artista
                if (isArtist) {
                    downgradeToMemberBtn.classList.remove('hidden');
                } else {
                    downgradeToMemberBtn.classList.add('hidden');
                }
            }
        }
    }


    // === FUNÇÃO DE UPLOAD DE FOTO ===
    if (editPhotoBtn) {
        editPhotoBtn.addEventListener('click', () => {
            photoUploadInput.click();
        });
    }

    if (photoUploadInput) {
        photoUploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result;
                
                user.profilePicture = base64Image;
                localStorage.setItem('userProfile', JSON.stringify(user));
                
                loadUserProfile(); 
                
            };

            reader.readAsDataURL(file);
        });
    }


    // === FUNÇÕES DE SALVAMENTO E CANCELAMENTO ===

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const newUsername = editUsernameInput.value.trim();
            const newEmail = editEmailInput.value.trim();
            const newPhone = editPhoneInput.value.replace(/\D/g, ''); 

            if (newUsername && newEmail) {
                user.username = newUsername;
                user.email = newEmail;
                user.phone = newPhone;
                
                localStorage.setItem('userProfile', JSON.stringify(user));
                
                loadUserProfile(); 
                alert('Perfil atualizado com sucesso!');
                showActionsSection(); // Retorna à visão principal
            } else {
                alert('Preencha nome de usuário e email.');
            }
        });
    }
    
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', showActionsSection);
    }


    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', () => {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword && newPassword === confirmPassword) {
                user.password = newPassword;
                localStorage.setItem('userProfile', JSON.stringify(user));
                
                loadUserProfile(); 
                alert('Senha alterada com sucesso!');
                showActionsSection(); // Retorna à visão principal
            } else {
                alert('As senhas não coincidem ou o campo está vazio.');
            }
        });
    }

    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', showActionsSection);
    }


    // EVENTOS E LÓGICA DE UPGRADE (Sem perguntas)
    if (upgradeToArtistBtn) {
        upgradeToArtistBtn.addEventListener('click', () => {
             // Confirmação básica antes de alterar
            if (confirm('Tem certeza que deseja mudar seu perfil para "Artista"?')) {
                user.role = 'Artista'; 
                // Limpa quaisquer dados específicos de visitante/membro, se houver
                delete user.artistArea;
                delete user.socialLink;

                localStorage.setItem('userProfile', JSON.stringify(user));
                
                loadUserProfile(); 
                
                alert('Parabéns! 🎉 Sua conta agora é "Artista". Bem-vindo(a)!');
            }
        });
    }


    // LÓGICA DE DOWNGRADE (Tornar-se Visitante/Membro)
    if (downgradeToMemberBtn) {
        downgradeToMemberBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja reverter para a conta "Visitante"? Você perderá acesso às ferramentas de Artista.')) {
                
                // CORRIGIDO: Define o papel para 'Visitante'
                user.role = 'Visitante'; 
                
                // Limpa dados específicos de artista
                delete user.artistArea;
                delete user.socialLink;

                localStorage.setItem('userProfile', JSON.stringify(user));
                
                alert('Seu perfil foi revertido para "Visitante".');
                
                showActionsSection(); // Recarrega a visualização
            }
        });
    }


    // === EVENT LISTENER PARA MÁSCARA DO TELEFONE ===
    if (editPhoneInput) {
        editPhoneInput.addEventListener('input', (e) => {
            e.target.value = maskPhone(e.target.value);
        });
    }


    // === INICIALIZAÇÃO ===
    loadUserProfile(); 
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', showEditProfileForm);
    }
    
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', showChangePasswordForm);
    }
});