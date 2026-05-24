document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);

    const btnVisitante = $('btn-tab-visitante');
    const btnArtista = $('btn-tab-artista');
    const tabToggleBg = $('tab-toggle-bg');
    const roleInput = $('role-input');
    const fieldsContainer = $('dynamic-fields-container');
    const form = $('cadastro-form');

    // Templates exatos dos campos conforme o Protótipo de Imagem
    const templateVisitante = `
        <div class="lc-group">
            <label for="username">Usuario</label>
            <input type="text" id="username" name="username" placeholder="Nome de usuario" required autocomplete="username">
            <span id="username-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Seu email" required autocomplete="email">
            <span id="email-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="password">Senha</label>
            <input type="password" id="password" name="password" placeholder="Sua Senha" required autocomplete="new-password">
            <span id="password-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="confirm_password">Senha</label>
            <input type="password" id="confirm_password" name="confirm_password" placeholder="Confirme sua senha" required autocomplete="new-password">
            <span id="confirm_password-error" class="lc-field-error"></span>
        </div>
    `;

    const templateArtista = `
        <div class="lc-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Seu email" required autocomplete="email">
            <span id="email-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="password">Senha</label>
            <input type="password" id="password" name="password" placeholder="Sua Senha" required autocomplete="new-password">
            <span id="password-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="confirm_password">Senha</label>
            <input type="password" id="confirm_password" name="confirm_password" placeholder="Confirme sua senha" required autocomplete="new-password">
            <span id="confirm_password-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="bandName">Nome da banda</label>
            <input type="text" id="bandName" name="bandName" placeholder="nome da sua banda" required>
            <span id="bandName-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="numIntegrantes">Quantidade de integrantes</label>
            <select id="numIntegrantes" name="numIntegrantes" required class="lc-select-custom">
                <option value="" disabled selected hidden>Quantidade de integrantes</option>
                <option value="solo">Solo</option>
                <option value="2a4">De 2 a 4 integrantes</option>
                <option value="mais4">Mais de 4 integrantes</option>
            </select>
            <span id="numIntegrantes-error" class="lc-field-error"></span>
        </div>

        <div class="lc-group">
            <label for="musicalStyle">Estilo musical</label>
            <input type="text" id="musicalStyle" name="musicalStyle" placeholder="Seu estilo" required>
            <span id="musicalStyle-error" class="lc-field-error"></span>
        </div>
    `;

    // Função para renderizar os campos e mover o background da aba
    const switchTab = (targetRole) => {
        if (targetRole === 'visitante') {
            btnVisitante.classList.add('active');
            btnArtista.classList.remove('active');
            tabToggleBg.style.left = '4px';
            roleInput.value = 'visitante';
            fieldsContainer.innerHTML = templateVisitante;
        } else {
            btnArtista.classList.add('active');
            btnVisitante.classList.remove('active');
            tabToggleBg.style.left = 'calc(50% - 2px)';
            roleInput.value = 'artista';
            fieldsContainer.innerHTML = templateArtista;
        }
        setupInputListeners();
    };

    btnVisitante.addEventListener('click', () => switchTab('visitante'));
    btnArtista.addEventListener('click', () => switchTab('artista'));

    // Inicializa carregando a aba visitante por padrão (conforme lado direito da imagem)
    switchTab('visitante');

    // Adiciona limpeza de erro automática ao começar a digitar nos campos dinâmicos
    function setupInputListeners() {
        const inputs = fieldsContainer.querySelectorAll('input, select');
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                inp.classList.remove('input-error');
                const errSpan = $(inp.id + '-error');
                if (errSpan) errSpan.style.display = 'none';
            });
        });
    }

    const markVisualError = (inputEl, msg) => {
        if (!inputEl) return;
        inputEl.classList.add('input-error');
        const errSpan = $(inputEl.id + '-error');
        if (errSpan) {
            errSpan.textContent = msg;
            errSpan.style.display = 'block';
        }
    };

    // Validação Visual antes de enviar ao Servidor Node
    form.addEventListener('submit', (e) => {
        let ok = true;
        
        // Limpa erros anteriores
        const errors = fieldsContainer.querySelectorAll('.lc-field-error');
        errors.forEach(span => span.style.display = 'none');
        const inputs = fieldsContainer.querySelectorAll('input, select');
        inputs.forEach(inp => inp.classList.remove('input-error'));

        const email = $('email');
        const password = $('password');
        const confirmPassword = $('confirm_password');

        // Validações básicas comuns
        if (email && (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))) {
            markVisualError(email, 'Insira um e-mail válido.');
            ok = false;
        }

        if (password && password.value.length < 6) {
            markVisualError(password, 'A senha necessita ter no mínimo 6 caracteres.');
            ok = false;
        }

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            markVisualError(confirmPassword, 'As senhas informadas não coincidem.');
            ok = false;
        }

        // Validações específicas por perfil
        if (roleInput.value === 'visitante') {
            const username = $('username');
            if (username && !username.value.trim()) {
                markVisualError(username, 'O nome de usuário é obrigatório.');
                ok = false;
            }
        } else {
            const bandName = $('bandName');
            const numIntegrantes = $('numIntegrantes');
            const musicalStyle = $('musicalStyle');

            if (bandName && !bandName.value.trim()) {
                markVisualError(bandName, 'O nome da banda é obrigatório.');
                ok = false;
            }
            if (numIntegrantes && !numIntegrantes.value) {
                markVisualError(numIntegrantes, 'Selecione a quantidade de integrantes.');
                ok = false;
            }
            if (musicalStyle && !musicalStyle.value.trim()) {
                markVisualError(musicalStyle, 'O estilo musical é obrigatório.');
                ok = false;
            }
        }

        // Se houver erros, impede o envio do formulário real
        if (!ok) {
            e.preventDefault();
        }
    });
});