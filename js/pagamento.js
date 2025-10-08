// Arquivo: pagamento.js (VERSÃO FINAL E CORRIGIDA: Resolve o bug do valor zerado)

document.addEventListener('DOMContentLoaded', () => {
    
    // === 1. UTILITÁRIOS E VALIDAÇÕES RÍGIDAS ===
    
    const formatCurrency = (value) => {
        return parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    function isValidCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, "");
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        
        let sum = 0; let remainder;
        for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
        remainder = (sum * 10) % 11;
        if ((remainder === 10) || (remainder === 11)) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;
        
        sum = 0;
        for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
        remainder = (sum * 10) % 11;
        if ((remainder === 10) || (remainder === 11)) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }
    
    function isValidCardNumber(number) {
        return number.replace(/\s/g, '').length === 16; 
    }
    
    function isValidExpiry(expiry) {
        const parts = expiry.split('/');
        if (parts.length !== 2 || expiry.length !== 5) return false;

        const month = parseInt(parts[0], 10);
        const year = parseInt(parts[1], 10);
        
        if (month < 1 || month > 12) return false;
        
        const currentYearFull = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const inputYearFull = 2000 + year;

        if (inputYearFull < currentYearFull) return false;
        if (inputYearFull === currentYearFull && month < currentMonth) return false;
        
        return true;
    }
    
    function isValidCVV(cvv) {
        const len = cvv.length;
        return len === 3 || len === 4;
    }

    // === 2. UTILITÁRIOS DE ESTILO E MÁSCARA ===

    const markAsError = (el) => el.classList.add('input-error-border');
    const unmarkAsError = (el) => el.classList.remove('input-error-border');
    
    function showCheckoutError(message, step) {
        let errorElement = (step === 1) ? document.getElementById('error-message-step1') : document.getElementById('error-message-step2');
        if (!errorElement) return;
        errorElement.innerHTML = message;
        errorElement.style.display = 'block';
    }

    function hideCheckoutError(step) {
        let errorElement = (step === 1) ? document.getElementById('error-message-step1') : document.getElementById('error-message-step2');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    function applyMask(input, mask) {
        let value = input.value.replace(/[^\d]/g, "");
        let maskedValue = "";
        let k = 0;
        
        for (let i = 0; i < mask.length; i++) {
            if (k >= value.length) break;
            
            if (mask[i] === '9') {
                maskedValue += value[k++];
            } else {
                maskedValue += mask[i];
            }
        }
        input.value = maskedValue;
    }

    // === 3. VARIÁVEIS DE ESTADO E INICIALIZAÇÃO ===
    
    // Tenta carregar a ordem, se falhar, currentOrder é null.
    const currentOrder = JSON.parse(localStorage.getItem('currentOrder'));
    
    if (!currentOrder || !currentOrder.total) { 
        alert("Nenhum instrumento selecionado. Retornando à seleção.");
        window.location.href = 'estilos.html';
        return;
    }

    const formInfo = document.getElementById('info-form');
    const paymentForm = document.getElementById('payment-form');
    const paymentMethodSelect = document.getElementById('payment-method');

    // Elementos de Confirmação (IDs no HTML)
    const productTitleConfirmEl = document.getElementById('product-title-confirm');
    const totalConfirmEl = document.getElementById('total-confirm');
    const productTitlePixEl = document.getElementById('product-title-pix');
    const totalPixEl = document.getElementById('total-pix');

    // Elementos de Input
    const cpfInput = document.getElementById('cpf');
    const emailInput = document.getElementById('email');
    const cardNumberInput = document.getElementById('card-number'); 
    const validadeInput = document.getElementById('validade'); 
    const cvvInput = document.getElementById('cvv'); 
    const cardHolderNameInput = document.getElementById('card-holder-name');
    
    // === 4. FUNÇÕES DE VALIDAÇÃO COM ESPECIFICAÇÃO DE ERRO ===
    
    function validateStep1() {
        hideCheckoutError(1);
        let isValid = true;
        let errorMessage = "Preencha corretamente os campos em vermelho:<br>";
        const requiredInputs = formInfo.querySelectorAll('input[required]');
        let firstErrorElement = null;

        formInfo.querySelectorAll('.input-error-border').forEach(unmarkAsError);

        requiredInputs.forEach(input => {
            let errorFound = false;
            
            if (input.value.trim() === "") {
                markAsError(input);
                isValid = false;
                errorFound = true;
                if (!firstErrorElement) firstErrorElement = input;
                errorMessage += `• O campo **${input.labels[0].textContent}** está vazio.<br>`;
            } 
            
            if (!errorFound && input.id === 'email' && !isValidEmail(input.value)) {
                markAsError(input);
                isValid = false;
                if (!firstErrorElement) firstErrorElement = input;
                errorMessage += `• O **Email** não está em um formato válido.<br>`;
            }
            
            if (!errorFound && input.id === 'cpf' && !isValidCPF(input.value)) {
                 markAsError(input);
                 isValid = false;
                 if (!firstErrorElement) firstErrorElement = input;
                 errorMessage += `• O **CPF** informado é inválido.<br>`;
            }
        });

        if (!isValid) {
            showCheckoutError(errorMessage, 1);
            firstErrorElement?.focus(); 
            return false;
        }

        // Salva os dados do cliente
        const formData = { 
            nome: document.getElementById('nome').value,
            email: emailInput.value,
            cpf: cpfInput.value,
            // ... (restante dos dados do endereço)
        };
        localStorage.setItem('checkoutInfo', JSON.stringify(formData));
        return true;
    }

    function validateStep2() {
        hideCheckoutError(2);
        let isValid = true;
        let errorMessage = "Corrija os campos do pagamento:<br>";
        
        paymentForm.querySelectorAll('.input-error-border').forEach(unmarkAsError);
        let firstErrorElement = null;
        
        if (paymentMethodSelect.value === "") {
            markAsError(paymentMethodSelect);
            showCheckoutError("Selecione uma forma de pagamento para continuar.", 2);
            paymentMethodSelect.focus();
            return false;
        }

        if (paymentMethodSelect.value === 'cartao') {
            
            // Checagem de Nome
            if (cardHolderNameInput && cardHolderNameInput.value.trim() === "") {
                markAsError(cardHolderNameInput);
                isValid = false;
                errorMessage += "• O **Nome no Cartão** é obrigatório.<br>";
                if (!firstErrorElement) firstErrorElement = cardHolderNameInput;
            }

            // Checagem de Número
            if (cardNumberInput && !isValidCardNumber(cardNumberInput.value)) {
                markAsError(cardNumberInput);
                isValid = false;
                errorMessage += "• O **Número do Cartão** deve ter 16 dígitos.<br>";
                if (!firstErrorElement) firstErrorElement = cardNumberInput;
            }
            
            // Checagem de Validade
            if (validadeInput && !isValidExpiry(validadeInput.value)) {
                markAsError(validadeInput);
                isValid = false;
                errorMessage += "• A **Validade (MM/AA)** está incorreta ou expirada.<br>";
                if (!firstErrorElement) firstErrorElement = validadeInput;
            }
            
            // Checagem de CVV
            if (cvvInput && !isValidCVV(cvvInput.value)) {
                markAsError(cvvInput);
                isValid = false;
                errorMessage += "• O **CVV** deve ter 3 ou 4 dígitos.<br>";
                if (!firstErrorElement) firstErrorElement = cvvInput;
            }
            
            if (!isValid) {
                showCheckoutError(errorMessage, 2);
                firstErrorElement?.focus();
                return false;
            }
        }
        
        currentOrder.paymentMethod = paymentMethodSelect.value;
        localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
        return true;
    }


    // === 5. CONTROLE DE FLUXO E EVENTOS (BLOCO CORRIGIDO) ===

    document.getElementById('next-to-payment').addEventListener('click', (e) => {
        e.preventDefault(); 
        if (validateStep1()) {
            renderStep(2);
        }
    });

    document.getElementById('back-to-info').addEventListener('click', () => {
        renderStep(1);
    });

    document.getElementById('payment-form').addEventListener('submit', (e) => {
        e.preventDefault(); 
        if (validateStep2()) {
            
            document.getElementById('submit-payment').textContent = 'Processando...';
            document.getElementById('submit-payment').disabled = true;
            
            // 🚨 CORREÇÃO CRÍTICA: Salva os dados necessários para a confirmação 
            // ANTES de limpar o localStorage.
            const finalOrderDetails = {
                title: currentOrder.title,
                total: currentOrder.total,
                paymentMethod: currentOrder.paymentMethod
            };

            setTimeout(() => {
                let userOrders = JSON.parse(localStorage.getItem('userOrders')) || [];
                userOrders.push({
                    ...currentOrder,
                    checkoutInfo: JSON.parse(localStorage.getItem('checkoutInfo')),
                    date: new Date().toISOString()
                }); 
                
                localStorage.setItem('userOrders', JSON.stringify(userOrders));
                
                // Limpa dados temporários
                localStorage.removeItem('currentOrder');
                localStorage.removeItem('checkoutInfo');
                
                // 🚨 CORREÇÃO: Passa os detalhes da ordem (finalOrderDetails) para o renderStep(3)
                renderStep(3, finalOrderDetails); 
                document.getElementById('submit-payment').textContent = 'Finalizar Pedido';
                document.getElementById('submit-payment').disabled = false;
            }, 1000); 
        }
    });
    
    // Configuração de máscaras e remoção de erro ao digitar
    function setupMasks() {
        document.querySelectorAll('.step-section input').forEach(element => {
            element.addEventListener('input', () => {
                unmarkAsError(element); // Remove a borda de erro ao digitar
                
                if (element.id === 'cpf') { applyMask(element, '999.999.999-99'); }
                if (element.id === 'cep') { applyMask(element, '99999-999'); }
                if (element.id === 'card-number') { applyMask(element, '9999 9999 9999 9999'); }
                if (element.id === 'validade') { applyMask(element, '99/99'); }
                if (element.id === 'cvv') { applyMask(element, '9999'); }
            });
        });
    }

    // Configuração da visibilidade dos campos de pagamento
    document.getElementById('payment-method').addEventListener('change', (e) => {
        const selectedMethod = e.target.value;
        const paymentDetails = document.getElementById('payment-details');
        
        paymentDetails.querySelectorAll('[data-method]').forEach(detail => {
            detail.style.display = 'none';
        });
        
        // Remove 'required' e erros de todos os inputs de cartão
        paymentDetails.querySelectorAll('input').forEach(input => {
             input.removeAttribute('required');
             unmarkAsError(input);
        });

        if (selectedMethod) {
            const detailSection = paymentDetails.querySelector(`[data-method="${selectedMethod}"]`);
            if (detailSection) {
                detailSection.style.display = 'block';
                
                if (selectedMethod === 'cartao') {
                    // Torna campos de cartão obrigatórios
                    detailSection.querySelectorAll('input').forEach(input => {
                        input.setAttribute('required', 'required');
                    });
                }
            }
        }
        hideCheckoutError(2);
    });

    // === 6. RENDERIZAÇÃO DE PASSOS (FUNÇÃO CORRIGIDA) ===
    
    // 🚨 CORREÇÃO: Adiciona o parâmetro opcional orderData
    function renderStep(step, orderData = null) {
        const steps = document.querySelectorAll('.step-item');
        
        // Lógica de navegação visual
        document.querySelectorAll('.step-section').forEach(section => { section.style.display = 'none'; });
        document.getElementById(`step-${step}`).style.display = 'block';
        steps.forEach(s => { s.classList.remove('active'); });
        steps.forEach(s => { if (parseInt(s.getAttribute('data-step')) <= step) { s.classList.add('active'); } });

        hideCheckoutError(1);
        hideCheckoutError(2);
        
        if (step === 2) {
            // Resumo do pedido (Instrumento) - USA currentOrder, que está OK nesta etapa
            const orderSummaryEl = document.getElementById('order-summary');
            const productTitle = currentOrder.title || 'Instrumento Selecionado';
            const totalFormatted = formatCurrency(currentOrder.total);

            orderSummaryEl.innerHTML = `
                <p class="summary-title">Resumo do Pedido</p>
                <p>Instrumento: <strong>${productTitle}</strong></p>
                <p class="summary-total">Total a Pagar: ${totalFormatted}</p>
            `;
        }
        
        if (step === 3) {
            // 🚨 CORREÇÃO: Tenta usar o dado passado (orderData) ou, como fallback, o currentOrder (que agora estará vazio)
            const dataToUse = orderData || currentOrder; 

            // Checagem de segurança
            if (!dataToUse || !dataToUse.total) {
                console.error("Dados da ordem ausentes na confirmação.");
                return; 
            }
            
            const paymentMethod = dataToUse.paymentMethod;
            const productTitle = dataToUse.title || 'Instrumento';
            const totalFormatted = formatCurrency(dataToUse.total);

            document.getElementById('confirmation-details').style.display = (paymentMethod !== 'pix' ? 'block' : 'none');
            document.getElementById('pix-payment-details').style.display = (paymentMethod === 'pix' ? 'block' : 'none');

            if (paymentMethod === 'pix') {
                productTitlePixEl.textContent = productTitle;
                totalPixEl.textContent = totalFormatted;
            } else {
                productTitleConfirmEl.textContent = productTitle;
                totalConfirmEl.textContent = totalFormatted;
            }
        }
    }

    // === INICIALIZAÇÃO ===
    setupMasks();
    renderStep(1); 
});