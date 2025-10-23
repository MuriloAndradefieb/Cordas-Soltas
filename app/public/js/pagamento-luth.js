document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. CONSTANTES E ELEMENTOS
    // =========================================================================
    const $ = id => document.getElementById(id);
    const currentOrder = JSON.parse(localStorage.getItem('currentOrder'));
    
    // Verifica se há um pedido ativo antes de prosseguir
    if (!currentOrder || !currentOrder.total) { 
        alert("Nenhum instrumento selecionado. Retornando à seleção.");
        window.location.href = '/estilos';
        return;
    }

    const Elements = {
        formInfo: $('info-form'),
        paymentForm: $('payment-form'),
        paymentMethodSelect: $('payment-method'),
        
        // Inputs Principais
        cpfInput: $('cpf'),
        emailInput: $('email'),
        cardHolderNameInput: $('card-holder-name'),
        cardNumberInput: $('card-number'), 
        validadeInput: $('validade'), 
        cvvInput: $('cvv'), 

        // Elementos de Confirmação (Passo 3)
        productTitleConfirmEl: $('product-title-confirm'),
        totalConfirmEl: $('total-confirm'),
        productTitlePixEl: $('product-title-pix'),
        totalPixEl: $('total-pix'),
    };

    // =========================================================================
    // 2. FUNÇÕES AUXILIARES E VALIDAÇÃO (Objeto Utils)
    // =========================================================================
    const Utils = (() => {
        
        // --- Formatação e Feedback ---
        const formatCurrency = (value) => {
            return parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };
        const markAsError = (el) => el?.classList.add('input-error-border');
        const unmarkAsError = (el) => el?.classList.remove('input-error-border');

        const toggleCheckoutError = (message, step, show = true) => {
            const errorElement = $(`error-message-step${step}`);
            if (!errorElement) return;
            if (show) {
                errorElement.innerHTML = message;
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
        };
        const hideCheckoutError = (step) => toggleCheckoutError('', step, false);
        const showCheckoutError = (message, step) => toggleCheckoutError(message, step, true);

        // --- Validações (Lógica complexa mantida) ---
        const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isValidCardNumber = (number) => number.replace(/\s/g, '').length === 16;
        const isValidCVV = (cvv) => cvv.length === 3 || cvv.length === 4;

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

        return { formatCurrency, markAsError, unmarkAsError, hideCheckoutError, showCheckoutError,
                 isValidEmail, isValidCPF, isValidCardNumber, isValidExpiry, isValidCVV };
    })();
    

    const validateStep1 = () => {
        Utils.hideCheckoutError(1);
        let isValid = true;
        let errorMessage = "Preencha corretamente os campos em vermelho:<br>";
        let firstErrorElement = null;

        Elements.formInfo.querySelectorAll('.input-error-border').forEach(Utils.unmarkAsError);
        const requiredInputs = Array.from(Elements.formInfo.querySelectorAll('input[required]'));

        requiredInputs.forEach(input => {
            let errorFound = false;
            const value = input.value.trim();
            const labelText = input.labels && input.labels[0] ? input.labels[0].textContent : input.id;
            
            if (!value) {
                isValid = false; errorFound = true; Utils.markAsError(input);
                if (!firstErrorElement) firstErrorElement = input;
                errorMessage += `• O campo **${labelText}** está vazio.<br>`;
            } 
            
            if (!errorFound && input.id === 'email' && !Utils.isValidEmail(value)) {
                isValid = false; errorFound = true; Utils.markAsError(input);
                if (!firstErrorElement) firstErrorElement = input;
                errorMessage += `• O **Email** não está em um formato válido.<br>`;
            }
            
            if (!errorFound && input.id === 'cpf' && !Utils.isValidCPF(value)) {
                isValid = false; Utils.markAsError(input);
                if (!firstErrorElement) firstErrorElement = input;
                errorMessage += `• O **CPF** informado é inválido.<br>`;
            }
        });

        if (!isValid) {
            Utils.showCheckoutError(errorMessage, 1);
            firstErrorElement?.focus(); 
            return false;
        }

        localStorage.setItem('checkoutInfo', JSON.stringify({ 
            nome: $('nome').value,
            email: Elements.emailInput.value,
            cpf: Elements.cpfInput.value,
        }));
        return true;
    };

    const validateStep2 = () => {
        Utils.hideCheckoutError(2);
        let isValid = true;
        let errorMessage = "Corrija os campos do pagamento:<br>";
        let firstErrorElement = null;
        
        Elements.paymentForm.querySelectorAll('.input-error-border').forEach(Utils.unmarkAsError);

        if (Elements.paymentMethodSelect.value === "") {
            Utils.markAsError(Elements.paymentMethodSelect);
            Utils.showCheckoutError("Selecione uma forma de pagamento para continuar.", 2);
            Elements.paymentMethodSelect.focus();
            return false;
        }

        if (Elements.paymentMethodSelect.value === 'cartao') {
            const cardFields = [
                { input: Elements.cardHolderNameInput, validate: (v) => v.trim() !== "", msg: "• Nome no Cartão é obrigatório.<br>" },
                { input: Elements.cardNumberInput, validate: Utils.isValidCardNumber, msg: "• Número do Cartão deve ter 16 dígitos.<br>" },
                { input: Elements.validadeInput, validate: Utils.isValidExpiry, msg: "• Validade (MM/AA) está incorreta ou expirada.<br>" },
                { input: Elements.cvvInput, validate: Utils.isValidCVV, msg: "• CVV deve ter 3 ou 4 dígitos.<br>" },
            ];
            
            cardFields.forEach(field => {
                if (field.input && !field.validate(field.input.value)) {
                    Utils.markAsError(field.input);
                    isValid = false;
                    errorMessage += field.msg;
                    if (!firstErrorElement) firstErrorElement = field.input;
                }
            });
            
            if (!isValid) {
                Utils.showCheckoutError(errorMessage, 2);
                firstErrorElement?.focus();
                return false;
            }
        }
        
        // Atualiza a ordem com o método de pagamento
        currentOrder.paymentMethod = Elements.paymentMethodSelect.value;
        localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
        return true;
    };


    const renderStep = (step, orderData = currentOrder) => {
        // Lógica de exibição de seções e barra de progresso
        const steps = document.querySelectorAll('.step-item');
        document.querySelectorAll('.step-section').forEach(section => { section.style.display = 'none'; });
        $(`step-${step}`).style.display = 'block';
        steps.forEach(s => s.classList.remove('active'));
        steps.forEach(s => { 
            if (parseInt(s.getAttribute('data-step')) <= step) s.classList.add('active');
        });

        Utils.hideCheckoutError(1);
        Utils.hideCheckoutError(2);
        
        // Renderização do Resumo (Passo 2)
        if (step === 2) {
            const productTitle = orderData.title || 'Instrumento Selecionado';
            const totalFormatted = Utils.formatCurrency(orderData.total);

            $('order-summary').innerHTML = `
                <p class="summary-title">Resumo do Pedido</p>
                <p>Instrumento: <strong>${productTitle}</strong></p>
                <p class="summary-total">Total a Pagar: ${totalFormatted}</p>
            `;
        }
        
        // Renderização da Confirmação (Passo 3)
        if (step === 3) {
            const dataToUse = orderData || currentOrder; 

            if (!dataToUse || !dataToUse.total) { 
                console.error("Dados da ordem ausentes na confirmação.");
                return; 
            }
            
            const { paymentMethod, title, total } = dataToUse;
            const isPix = paymentMethod === 'pix';

            $('confirmation-details').style.display = isPix ? 'none' : 'block';
            $('pix-payment-details').style.display = isPix ? 'block' : 'none';

            const [titleEl, totalEl] = isPix 
                ? [Elements.productTitlePixEl, Elements.totalPixEl] 
                : [Elements.productTitleConfirmEl, Elements.totalConfirmEl];

            titleEl.textContent = title || 'Instrumento';
            totalEl.textContent = Utils.formatCurrency(total);
        }
    };


    // =========================================================================
    // 4. LÓGICA DE MÁSCARAS E EVENT LISTENERS
    // =========================================================================

    const setupMasks = () => {
        const applyMask = (input, mask) => {
            let value = input.value.replace(/[^\d]/g, "");
            let maskedValue = "";
            let k = 0;
            for (let i = 0; i < mask.length; i++) {
                if (k >= value.length) break;
                maskedValue += (mask[i] === '9') ? value[k++] : mask[i];
            }
            input.value = maskedValue;
        };

        const masks = {
            'cpf': '999.999.999-99', 'cep': '99999-999',
            'card-number': '9999 9999 9999 9999', 'validade': '99/99', 'cvv': '9999'
        };

        document.querySelectorAll('.step-section input').forEach(element => {
            element.addEventListener('input', () => {
                Utils.unmarkAsError(element);
                if (masks[element.id]) {
                    applyMask(element, masks[element.id]);
                }
            });
        });
    };

    const setupEventListeners = () => {
        // Navegação
        $('next-to-payment').addEventListener('click', (e) => {
            e.preventDefault(); 
            if (validateStep1()) renderStep(2);
        });

        $('back-to-info').addEventListener('click', () => renderStep(1));

        // Mudança de Método de Pagamento
        Elements.paymentMethodSelect.addEventListener('change', (e) => {
            const selectedMethod = e.target.value;
            const paymentDetails = $('payment-details');
            
            // Oculta tudo e remove required
            paymentDetails.querySelectorAll('[data-method]').forEach(detail => detail.style.display = 'none');
            paymentDetails.querySelectorAll('input').forEach(input => {
                input.removeAttribute('required');
                Utils.unmarkAsError(input);
            });

            const detailSection = paymentDetails.querySelector(`[data-method="${selectedMethod}"]`);
            if (detailSection) {
                detailSection.style.display = 'block';
                // Adiciona required apenas para campos de cartão
                if (selectedMethod === 'cartao') {
                    detailSection.querySelectorAll('input').forEach(input => input.setAttribute('required', 'required'));
                }
            }
            Utils.hideCheckoutError(2);
        });

        // Submissão do Formulário de Pagamento
        Elements.paymentForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            if (validateStep2()) {
                const submitButton = $('submit-payment');
                submitButton.textContent = 'Processando...';
                submitButton.disabled = true;
                
                // Consolida detalhes da ordem final (incluindo o método de pagamento salvo em currentOrder)
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
                    
                    
                    localStorage.removeItem('checkoutInfo');
                    
                    renderStep(3, finalOrderDetails); 
                    submitButton.textContent = 'Finalizar Pedido';
                    submitButton.disabled = false;
                }, 1000); 
            }
        });
    };

    setupMasks();
    setupEventListeners();
    renderStep(1); 
});