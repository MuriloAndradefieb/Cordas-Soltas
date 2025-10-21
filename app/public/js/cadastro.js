

document.addEventListener('DOMContentLoaded', () => {
    const cadastroForm = document.getElementById('cadastro-form');
    const roleArtista = document.getElementById('role-artista');
    const roleVisitante = document.getElementById('role-visitante');
    const artistFieldsDiv = document.getElementById('artist-fields');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const bandNameInput = document.getElementById('bandName');
    const musicalStyleInput = document.getElementById('musicalStyle');
    const instagramInput = document.getElementById('instagram');

    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
        return regex.test(email);
    }
    
    function markAsError(input, message) {
        const errorElement = document.getElementById(input.id + '-error');
        
        input.classList.add('input-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block'; 
        }
    }

    function unmarkAsError(input) {
        const errorElement = document.getElementById(input.id + '-error');
        
        input.classList.remove('input-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    function toggleArtistFields() {
        if (roleArtista.checked) {
            artistFieldsDiv.classList.remove('hidden-fields');
            bandNameInput.setAttribute('required', 'required');
            musicalStyleInput.setAttribute('required', 'required');
        } else {
            artistFieldsDiv.classList.add('hidden-fields');
            bandNameInput.removeAttribute('required');
            musicalStyleInput.removeAttribute('required');
            unmarkAsError(bandNameInput);
            unmarkAsError(musicalStyleInput);
        }
    }

    roleArtista.addEventListener('change', toggleArtistFields);
    roleVisitante.addEventListener('change', toggleArtistFields);
    toggleArtistFields(); 

    if (cadastroForm) {
        cadastroForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            let isValid = true;
            const roleInput = document.querySelector('input[name="role"]:checked');
            
            [usernameInput, emailInput, passwordInput, bandNameInput, musicalStyleInput, instagramInput].forEach(unmarkAsError);

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

            if (!roleInput) {
            }


            if (roleInput && roleInput.value.toLowerCase() === 'artista') {
                if (bandNameInput.value.trim() === '') {
                    markAsError(bandNameInput, 'O nome da banda/projeto é obrigatório.');
                    isValid = false;
                }
                if (musicalStyleInput.value.trim() === '') {
                    markAsError(musicalStyleInput, 'O estilo musical é obrigatório.');
                    isValid = false;
                }
            }
            
             if (!roleInput && isValid) { 
                 alert('Por favor, selecione seu tipo de conta (Artista ou Visitante) para prosseguir.');
                 isValid = false;
             }


            if (isValid) {
                
                let userProfileData = {
                    username: usernameInput.value,
                    email: emailInput.value,
                    password: passwordInput.value,
                    role: roleInput.value.toLowerCase() 
                };

                if (userProfileData.role === 'artista') {
                    userProfileData.bandName = bandNameInput.value;
                    userProfileData.musicalStyle = musicalStyleInput.value;
                    userProfileData.instagram = instagramInput.value;
                }

                localStorage.setItem('userProfile', JSON.stringify(userProfileData));
                alert('Cadastro realizado com sucesso! Agora faça o login.');
                window.location.href = '/login';
            }
        });
    }
});