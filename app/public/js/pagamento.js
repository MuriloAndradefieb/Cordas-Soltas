document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. CONSTANTES E ELEMENTOS
    // =========================================================================
    const $ = id => document.getElementById(id);
    const currentOrder = JSON.parse(localStorage.getItem('currentOrder'));

    if (!currentOrder || !currentOrder.total) {
        alert("Nenhum ingresso selecionado. Retornando à seleção.");
        window.location.href = '/';
        return;
    }

    const Elements = {
        formInfo:            $('info-form'),
        paymentForm:         $('payment-form'),
        paymentMethodSelect: $('payment-method'),
        cpfInput:            $('cpf'),
        emailInput:          $('email'),
        cardHolderNameInput: $('card-holder-name'),
        cardNumberInput:     $('card-number'),
        validadeInput:       $('validade'),
        cvvInput:            $('cvv'),
        productTitleConfirmEl: $('product-title-confirm') || $('show-title-confirm'),
        totalConfirmEl:        $('total-confirm'),
        productTitlePixEl:     $('product-title-pix')     || $('show-title-pix'),
        totalPixEl:            $('total-pix'),
    };

    // =========================================================================
    // 2. FUNÇÕES AUXILIARES E VALIDAÇÃO
    // =========================================================================
    const Utils = (() => {
        const formatCurrency = (value) =>
            parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const markAsError   = (el) => el?.classList.add('input-error-border');
        const unmarkAsError = (el) => el?.classList.remove('input-error-border');

        const toggleCheckoutError = (message, step, show = true) => {
            const el = $(`error-message-step${step}`);
            if (!el) return;
            el.innerHTML = message;
            el.style.display = show ? 'block' : 'none';
        };
        const hideCheckoutError  = (step) => toggleCheckoutError('', step, false);
        const showCheckoutError  = (msg, step) => toggleCheckoutError(msg, step, true);

        const isValidEmail      = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isValidCardNumber = (num)   => num.replace(/\s/g, '').length === 16;
        const isValidCVV        = (cvv)   => cvv.length === 3 || cvv.length === 4;

        function isValidCPF(cpf) {
            cpf = cpf.replace(/[^\d]/g, "");
            if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
            let sum = 0, remainder;
            for (let i = 1; i <= 9; i++) sum += parseInt(cpf[i - 1]) * (11 - i);
            remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf[9])) return false;
            sum = 0;
            for (let i = 1; i <= 10; i++) sum += parseInt(cpf[i - 1]) * (12 - i);
            remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf[10])) return false;
            return true;
        }

        function isValidExpiry(expiry) {
            const parts = expiry.split('/');
            if (parts.length !== 2 || expiry.length !== 5) return false;
            const month = parseInt(parts[0], 10), year = parseInt(parts[1], 10);
            if (month < 1 || month > 12) return false;
            const now      = new Date();
            const fullYear = 2000 + year;
            if (fullYear < now.getFullYear()) return false;
            if (fullYear === now.getFullYear() && month < now.getMonth() + 1) return false;
            return true;
        }

        return { formatCurrency, markAsError, unmarkAsError,
                 hideCheckoutError, showCheckoutError,
                 isValidEmail, isValidCPF, isValidCardNumber, isValidExpiry, isValidCVV };
    })();

    // =========================================================================
    // 3. VALIDAÇÕES POR PASSO
    // =========================================================================
    const validateStep1 = () => {
        Utils.hideCheckoutError(1);
        let isValid = true, firstErrorElement = null;
        let errorMessage = "Preencha corretamente os campos em vermelho:<br>";

        Elements.formInfo.querySelectorAll('.input-error-border').forEach(Utils.unmarkAsError);
        Array.from(Elements.formInfo.querySelectorAll('input[required]')).forEach(input => {
            let errorFound = false;
            const value    = input.value.trim();
            const label    = input.labels?.[0]?.textContent || input.id;

            if (!value) {
                isValid = false; errorFound = true; Utils.markAsError(input);
                if (!firstErrorElement) firstErrorElement = input;
                errorMessage += `• O campo **${label}** está vazio.<br>`;
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

        if (!isValid) { Utils.showCheckoutError(errorMessage, 1); firstErrorElement?.focus(); return false; }

        localStorage.setItem('checkoutInfo', JSON.stringify({
            nome:  $('nome').value,
            email: Elements.emailInput.value,
            cpf:   Elements.cpfInput.value,
        }));
        return true;
    };

    const validateStep2 = () => {
        Utils.hideCheckoutError(2);
        let isValid = true, firstErrorElement = null;
        let errorMessage = "Corrija os campos do pagamento:<br>";

        Elements.paymentForm.querySelectorAll('.input-error-border').forEach(Utils.unmarkAsError);

        if (!Elements.paymentMethodSelect.value) {
            Utils.markAsError(Elements.paymentMethodSelect);
            Utils.showCheckoutError("Selecione uma forma de pagamento para continuar.", 2);
            Elements.paymentMethodSelect.focus();
            return false;
        }

        if (Elements.paymentMethodSelect.value === 'cartao') {
            const fields = [
                { input: Elements.cardHolderNameInput, validate: v => v.trim() !== "",        msg: "• Nome no Cartão é obrigatório.<br>" },
                { input: Elements.cardNumberInput,     validate: Utils.isValidCardNumber,      msg: "• Número do Cartão deve ter 16 dígitos.<br>" },
                { input: Elements.validadeInput,       validate: Utils.isValidExpiry,          msg: "• Validade (MM/AA) está incorreta ou expirada.<br>" },
                { input: Elements.cvvInput,            validate: Utils.isValidCVV,             msg: "• CVV deve ter 3 ou 4 dígitos.<br>" },
            ];
            fields.forEach(f => {
                if (f.input && !f.validate(f.input.value)) {
                    Utils.markAsError(f.input); isValid = false; errorMessage += f.msg;
                    if (!firstErrorElement) firstErrorElement = f.input;
                }
            });
            if (!isValid) { Utils.showCheckoutError(errorMessage, 2); firstErrorElement?.focus(); return false; }
        }

        currentOrder.paymentMethod = Elements.paymentMethodSelect.value;
        localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
        return true;
    };

    // =========================================================================
    // 4. RENDERIZAÇÃO DE PASSOS
    // =========================================================================
    const renderStep = (step, orderData = currentOrder) => {
        document.querySelectorAll('.step-section').forEach(s => { s.style.display = 'none'; });
        $(`step-${step}`).style.display = 'block';

        document.querySelectorAll('.step-item').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.step) <= step);
        });

        Utils.hideCheckoutError(1);
        Utils.hideCheckoutError(2);

        if (step === 2) {
            $('order-summary').innerHTML = `
                <p class="summary-title">Resumo do Pedido</p>
                <p>Ingresso: <strong>${orderData.title || 'Ingresso Selecionado'}</strong></p>
                <p class="summary-total">Total a Pagar: ${Utils.formatCurrency(orderData.total)}</p>
            `;
        }

        if (step === 3) {
            if (!orderData?.total) return;
            const { paymentMethod, title, total } = orderData;
            const isPix = paymentMethod === 'pix';

            $('confirmation-details').style.display  = isPix ? 'none'  : 'block';
            $('pix-payment-details').style.display   = isPix ? 'block' : 'none';

            const [titleEl, totalEl] = isPix
                ? [Elements.productTitlePixEl, Elements.totalPixEl]
                : [Elements.productTitleConfirmEl, Elements.totalConfirmEl];

            if (titleEl) titleEl.textContent = title || 'Ingresso';
            if (totalEl) totalEl.textContent = Utils.formatCurrency(total);
        }
    };

    // =========================================================================
    // 5. CONFIRMAR PEDIDO NO SERVIDOR
    // ★ Grava na tabela `pedidos` para aparecer no histórico do admin
    // =========================================================================
    async function confirmarPedidoNoServidor(itensPedido, formaPagamento) {
        try {
            const resposta = await fetch('/pedidos/confirmar', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ itensPedido, formaPagamento })
            });
            const resultado = await resposta.json();
            if (!resultado.sucesso) {
                console.warn('Aviso ao confirmar pedido no servidor:', resultado.mensagem);
            }
        } catch (err) {
            console.error('Erro de rede ao confirmar pedido:', err);
        }
    }

    // =========================================================================
    // 6. MÁSCARAS E EVENT LISTENERS
    // =========================================================================
    const setupMasks = () => {
        const masks = {
            'cpf': '999.999.999-99', 'cep': '99999-999',
            'card-number': '9999 9999 9999 9999', 'validade': '99/99', 'cvv': '9999'
        };
        document.querySelectorAll('.step-section input').forEach(el => {
            el.addEventListener('input', () => {
                Utils.unmarkAsError(el);
                if (masks[el.id]) {
                    let val = el.value.replace(/[^\d]/g, ""), masked = "", k = 0;
                    for (let i = 0; i < masks[el.id].length; i++) {
                        if (k >= val.length) break;
                        masked += masks[el.id][i] === '9' ? val[k++] : masks[el.id][i];
                    }
                    el.value = masked;
                }
            });
        });
    };

    const setupEventListeners = () => {
        $('next-to-payment').addEventListener('click', (e) => {
            e.preventDefault();
            if (validateStep1()) renderStep(2);
        });

        $('back-to-info').addEventListener('click', () => renderStep(1));

        Elements.paymentMethodSelect.addEventListener('change', (e) => {
            const method         = e.target.value;
            const paymentDetails = $('payment-details');
            paymentDetails.querySelectorAll('[data-method]').forEach(d => { d.style.display = 'none'; });
            paymentDetails.querySelectorAll('input').forEach(inp => {
                inp.removeAttribute('required');
                Utils.unmarkAsError(inp);
            });
            const section = paymentDetails.querySelector(`[data-method="${method}"]`);
            if (section) {
                section.style.display = 'block';
                if (method === 'cartao') {
                    section.querySelectorAll('input').forEach(inp => inp.setAttribute('required', 'required'));
                }
            }
            Utils.hideCheckoutError(2);
        });

        Elements.paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateStep2()) return;

            const submitButton = $('submit-payment');
            submitButton.textContent = 'Processando...';
            submitButton.disabled    = true;

            const finalOrderDetails = {
                title:         currentOrder.title,
                total:         currentOrder.total,
                paymentMethod: currentOrder.paymentMethod
            };

            // ── Simula processamento (1 segundo) ──
            setTimeout(async () => {
                // ★ Registra o pedido confirmado no servidor
                // Monta a lista de itens a partir do localStorage do carrinho
                const itensPedido = currentOrder.tickets
                    ? [
                        currentOrder.tickets.full > 0 && {
                            id:           currentOrder.showId,
                            tipo_ingresso: 'Pista Inteira',
                            quantidade:   currentOrder.tickets.full,
                            preco:        currentOrder.priceFull || (currentOrder.total / (currentOrder.tickets.full + currentOrder.tickets.half))
                        },
                        currentOrder.tickets.half > 0 && {
                            id:           currentOrder.showId,
                            tipo_ingresso: 'Pista Meia-Entrada',
                            quantidade:   currentOrder.tickets.half,
                            preco:        currentOrder.priceHalf || (currentOrder.total / (currentOrder.tickets.full + currentOrder.tickets.half))
                        }
                      ].filter(Boolean)
                    : [];

                // Lê cartIds do localStorage caso existam
                const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
                if (cartItems.length > 0) {
                    await confirmarPedidoNoServidor(cartItems, currentOrder.paymentMethod);
                } else if (itensPedido.length > 0) {
                    await confirmarPedidoNoServidor(itensPedido, currentOrder.paymentMethod);
                }

                // Histórico local (mantido para compatibilidade)
                let userOrders = JSON.parse(localStorage.getItem('userOrders')) || [];
                userOrders.push({
                    ...currentOrder,
                    checkoutInfo: JSON.parse(localStorage.getItem('checkoutInfo')),
                    date: new Date().toISOString()
                });
                localStorage.setItem('userOrders', JSON.stringify(userOrders));
                localStorage.removeItem('checkoutInfo');
                localStorage.removeItem('cartItems');

                renderStep(3, finalOrderDetails);
                submitButton.textContent = 'Finalizar Pedido';
                submitButton.disabled    = false;
            }, 1000);
        });
    };

    setupMasks();
    setupEventListeners();
    renderStep(1);
});