document.addEventListener('DOMContentLoaded', async () => {
    const main = document.getElementById('main-content');
    let catalogo;
    try {
        const respostaCatalogo = await fetch('/api/luthbox/catalogo');
        const dadosCatalogo = await respostaCatalogo.json();
        if (!respostaCatalogo.ok) throw new Error(dadosCatalogo.mensagem || 'Não foi possível carregar os itens.');
        const imagens = { 'Instrumentos': '/img/luthrock.jpg', 'Acessórios': '/img/luthrock.jpg', 'Áudio': '/img/luthpagode.webp', 'Bateria avulsa': '/img/luthrock.jpg', 'Kits': '/img/luthjazz.jpg' };
        catalogo = dadosCatalogo.map(item => ({ ...item, imagem: item.imagemUrl || imagens[item.categoria] || '/img/luthrock.jpg' }));
    } catch (erro) {
        main.innerHTML = '<section class="luth-catalogo"><p class="luth-catalogo-feedback" role="alert"></p></section>';
        main.querySelector('.luth-catalogo-feedback').textContent = `${erro.message} Atualize a página ou entre novamente com uma conta artista.`;
        return;
    }
    const categorias = ['Todos', ...new Set(catalogo.map(item => item.categoria))];
    const selecionados = new Map();
    const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caractere]));
    const formatarPreco = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const hojeBrasilISO = () => {
        const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const valor = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
        return `${valor.year}-${valor.month}-${valor.day}`;
    };

    main.innerHTML = `
        <section class="luth-catalogo" aria-labelledby="catalogo-titulo">
            <nav class="luth-catalogo-acoes" aria-label="Navegação da Luthbox">
                <a href="/luthbox" class="luth-catalogo-voltar">&larr; Voltar para apresentação da Luthbox</a>
                <a href="/luthbox/solicitacoes" class="luth-catalogo-solicitacoes">Minhas solicitações <span aria-hidden="true">→</span></a>
            </nav>
            <header class="luth-catalogo-header">
                <p class="luth-catalogo-kicker">Aluguel para artistas</p>
                <h1 id="catalogo-titulo">Monte sua Luthbox</h1>
                <p>Escolha instrumentos, acessórios compatíveis e peças avulsas. Cada item é alugado por <strong>1 dia útil</strong>.</p>
            </header>
            <section class="luth-catalogo-controles" aria-label="Filtros do catálogo">
                <label for="filtro-categoria">Classificação</label>
                <select id="filtro-categoria">${categorias.map(categoria => `<option>${escapar(categoria)}</option>`).join('')}</select>
                <label class="sr-only" for="busca-item">Buscar item</label>
                <input id="busca-item" type="search" placeholder="Buscar instrumento ou acessório">
            </section>
            <div class="luth-catalogo-layout">
                <section class="luth-produtos" id="luth-produtos" aria-live="polite"></section>
                <aside class="luth-resumo" aria-labelledby="resumo-titulo">
                    <h2 id="resumo-titulo">Sua seleção</h2>
                    <p class="luth-resumo-prazo">Locação válida por 1 dia útil.</p>
                    <p id="luth-mensagem" class="luth-mensagem" role="status" hidden></p>
                    <fieldset class="luth-modalidade">
                        <legend>Como precisa do equipamento?</legend>
                        <label><input type="radio" name="modalidade" value="imediata" checked> Solicitação imediata <small>Para um show que acontece hoje. Não reserva antes da aprovação do administrador.</small></label>
                        <label><input type="radio" name="modalidade" value="agendada"> Agendamento antecipado <small>Para um show futuro; depende de aprovação e disponibilidade.</small></label>
                    </fieldset>
                    <div class="luth-data-show">
                        <label for="show-agendado">Evento/show vinculado</label>
                        <select id="show-agendado"></select>
                        <small>Selecione o evento em que sua banda participará. A retirada será vinculada a este show.</small>
                    </div>
                    <ul class="luth-itens-selecionados" id="luth-itens-selecionados"><li class="luth-vazio">Adicione itens ao catálogo.</li></ul>
                    <p class="luth-total">Total da diária <strong id="luth-total">R$ 0,00</strong></p>
                    <button type="button" class="luth-finalizar" id="luth-finalizar" disabled>Enviar para aprovação</button>
                    <p class="luth-resumo-nota">Após enviar, acompanhe a aprovação e o código de retirada em Minhas solicitações.</p>
                </aside>
            </div>
            <dialog class="luth-item-dialog" id="luth-item-dialog" aria-labelledby="luth-dialog-title">
                <button type="button" class="luth-dialog-close" aria-label="Fechar detalhes">×</button>
                <div class="luth-dialog-content">
                    <img id="luth-dialog-image" alt="">
                    <div class="luth-dialog-info">
                        <span class="luth-produto-categoria" id="luth-dialog-category"></span>
                        <h2 id="luth-dialog-title"></h2>
                        <p class="luth-produto-compativel" id="luth-dialog-compatible"></p>
                        <p id="luth-dialog-description"></p>
                        <p class="luth-dialog-stock" id="luth-dialog-stock"></p>
                        <strong class="luth-dialog-price" id="luth-dialog-price"></strong>
                        <fieldset class="luth-modalidade luth-dialog-booking">
                            <legend>Como quer utilizar este item?</legend>
                            <label><input type="radio" name="modalidade-dialog" value="imediata"> Solicitação imediata <small>Para um show que acontece hoje.</small></label>
                            <label><input type="radio" name="modalidade-dialog" value="agendada" checked> Agendamento antecipado <small>Para um show futuro.</small></label>
                        </fieldset>
                        <label class="luth-dialog-show-label" for="luth-dialog-show">Show vinculado</label>
                        <select id="luth-dialog-show"></select>
                        <p class="luth-dialog-feedback" id="luth-dialog-feedback" role="alert" hidden></p>
                        <button type="button" class="luth-dialog-add" id="luth-dialog-add">Adicionar à solicitação</button>
                    </div>
                </div>
            </dialog>
            <p class="luth-preco-nota">Valores demonstrativos por item e por diária; podem ser ajustados conforme o catálogo real.</p>
        </section>`;

    const grid = document.getElementById('luth-produtos');
    function renderCatalogo() {
        const categoria = document.getElementById('filtro-categoria').value;
        const busca = document.getElementById('busca-item').value.trim().toLocaleLowerCase('pt-BR');
        const itens = catalogo.filter(item => (categoria === 'Todos' || item.categoria === categoria) && `${item.nome} ${item.instrumento} ${item.descricao}`.toLocaleLowerCase('pt-BR').includes(busca));
        grid.innerHTML = itens.length ? itens.map(item => `
            <article class="luth-produto" data-product-card="${escapar(item.id)}" role="group" tabindex="0" aria-label="Detalhes de ${escapar(item.nome)}">
                <img src="${escapar(item.imagem)}" alt="Imagem de ${escapar(item.nome)}" loading="lazy">
                <div class="luth-produto-info">
                    <span class="luth-produto-categoria">${escapar(item.categoria)}</span>
                    <h2>${escapar(item.nome)}</h2>
                    <p class="luth-produto-compativel">Compatível com: ${escapar(item.instrumento)}</p>
                    <p>${escapar(item.descricao)}</p>
                    <p class="luth-produto-estoque">Disponíveis no catálogo: ${item.quantidadeDisponivel} unidade(s)</p>
                    <div class="luth-produto-rodape"><strong>${formatarPreco(item.preco)} <small>/ dia útil</small></strong>
                        <button type="button" data-add="${escapar(item.id)}" aria-label="Adicionar ${escapar(item.nome)} à seleção" ${item.quantidadeDisponivel < 1 ? 'disabled' : ''}>${item.quantidadeDisponivel < 1 ? 'Indisponível' : 'Adicionar'}</button></div>
                </div>
            </article>`).join('') : '<p class="luth-sem-resultados">Nenhum item encontrado nesta classificação.</p>';
    }

    function renderResumo() {
        const lista = document.getElementById('luth-itens-selecionados');
        const itens = [...selecionados.values()];
        lista.innerHTML = itens.length ? itens.map(item => `<li><span><strong>${escapar(item.nome)}</strong><small>${formatarPreco(item.preco)} / dia útil</small></span><span class="luth-contador"><button type="button" data-qty="${escapar(item.id)}" data-delta="-1" aria-label="Remover uma unidade de ${escapar(item.nome)}">−</button><output>${item.quantidade}</output><button type="button" data-qty="${escapar(item.id)}" data-delta="1" aria-label="Adicionar uma unidade de ${escapar(item.nome)}">+</button></span></li>`).join('') : '<li class="luth-vazio">Adicione itens ao catálogo.</li>';
        const total = itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
        document.getElementById('luth-total').textContent = formatarPreco(total);
        const showDisponivel = [...document.getElementById('show-agendado').options].some((opcao, indice) => indice > 0 && opcao.value && !opcao.hidden);
        document.getElementById('luth-finalizar').disabled = !itens.length || !showDisponivel || !document.getElementById('show-agendado').value;
    }

    const modal = document.getElementById('luth-item-dialog');
    const modalShow = document.getElementById('luth-dialog-show');
    let produtoModal = null;
    const modalMessage = texto => {
        const feedback = document.getElementById('luth-dialog-feedback');
        feedback.textContent = texto;
        feedback.hidden = !texto;
    };
    function atualizarShowsModal() {
        const modalidade = document.querySelector('input[name="modalidade-dialog"]:checked').value;
        const hoje = hojeBrasilISO();
        [...modalShow.options].forEach((opcao, indice) => {
            opcao.hidden = indice > 0 && modalidade === 'imediata' && opcao.dataset.date !== hoje;
        });
        if (modalShow.selectedOptions[0]?.hidden) modalShow.value = '';
        const disponivel = [...modalShow.options].some((opcao, indice) => indice > 0 && opcao.value && !opcao.hidden);
        const aviso = document.getElementById('luth-dialog-feedback');
        if (!disponivel) {
            aviso.textContent = modalidade === 'imediata'
                ? 'Não há show cadastrado para hoje. Escolha agendamento antecipado para um show futuro.'
                : 'Nenhum show futuro está vinculado à sua banda. Peça ao administrador para configurar a escala.';
            aviso.hidden = false;
        } else if (!modalShow.value) {
            aviso.textContent = 'Selecione o show em que sua banda participará.';
            aviso.hidden = false;
        } else {
            aviso.hidden = true;
        }
        document.getElementById('luth-dialog-add').disabled = !disponivel || !modalShow.value || produtoModal?.quantidadeDisponivel < 1;
    }
    function abrirDetalhes(produto) {
        produtoModal = produto;
        document.getElementById('luth-dialog-image').src = produto.imagem;
        document.getElementById('luth-dialog-image').alt = `Imagem de ${produto.nome}`;
        document.getElementById('luth-dialog-category').textContent = produto.categoria;
        document.getElementById('luth-dialog-title').textContent = produto.nome;
        document.getElementById('luth-dialog-compatible').textContent = `Compatível com: ${produto.instrumento}`;
        document.getElementById('luth-dialog-description').textContent = produto.descricao;
        document.getElementById('luth-dialog-stock').textContent = `${produto.quantidadeDisponivel} unidade(s) disponível(is) no catálogo`;
        document.getElementById('luth-dialog-price').textContent = `${formatarPreco(produto.preco)} / dia útil`;
        modalShow.innerHTML = seletorShow.innerHTML;
        const showAtual = seletorShow.value;
        if (showAtual) modalShow.value = showAtual;
        const modalidadeAtual = document.querySelector('input[name="modalidade"]:checked').value;
        document.querySelector(`input[name="modalidade-dialog"][value="${modalidadeAtual}"]`).checked = true;
        modalMessage('');
        atualizarShowsModal();
        modal.showModal();
    }
    function adicionarItem(produto) {
        const atual = selecionados.get(produto.id);
        if ((atual?.quantidade || 0) >= produto.quantidadeDisponivel) {
            const aviso = document.getElementById('luth-mensagem');
            aviso.textContent = `Há somente ${produto.quantidadeDisponivel} unidade(s) cadastrada(s) para ${produto.nome}.`;
            aviso.hidden = false;
            return false;
        }
        selecionados.set(produto.id, { ...produto, quantidade: (atual?.quantidade || 0) + 1 });
        renderResumo();
        return true;
    }
    grid.addEventListener('click', event => {
        const addButton = event.target.closest('[data-add]');
        if (addButton) {
            const item = catalogo.find(produto => produto.id === addButton.dataset.add);
            if (item) adicionarItem(item);
            return;
        }
        const card = event.target.closest('[data-product-card]');
        if (!card) return;
        const produto = catalogo.find(item => item.id === card.dataset.productCard);
        if (produto) abrirDetalhes(produto);
    });
    grid.addEventListener('keydown', event => {
        const card = event.target.closest('[data-product-card]');
        if (!card || event.target !== card || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        const produto = catalogo.find(item => item.id === card.dataset.productCard);
        if (produto) abrirDetalhes(produto);
    });
    document.querySelector('.luth-dialog-close').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
    document.querySelectorAll('input[name="modalidade-dialog"]').forEach(radio => radio.addEventListener('change', atualizarShowsModal));
    modalShow.addEventListener('change', atualizarShowsModal);
    document.getElementById('luth-dialog-add').addEventListener('click', () => {
        if (!produtoModal || !modalShow.value) {
            modalMessage('Selecione um show para vincular esta solicitação.');
            return;
        }
        const modalidadeDialog = document.querySelector('input[name="modalidade-dialog"]:checked').value;
        document.querySelector(`input[name="modalidade"][value="${modalidadeDialog}"]`).checked = true;
        document.querySelector(`input[name="modalidade"][value="${modalidadeDialog}"]`).dispatchEvent(new Event('change', { bubbles: true }));
        seletorShow.value = modalShow.value;
        seletorShow.dispatchEvent(new Event('change', { bubbles: true }));
        if (adicionarItem(produtoModal)) modal.close();
    });
    document.getElementById('luth-itens-selecionados').addEventListener('click', event => {
        const button = event.target.closest('[data-qty]');
        if (!button) return;
        const item = selecionados.get(button.dataset.qty);
        if (Number(button.dataset.delta) > 0) {
            const produto = catalogo.find(produtoCatalogo => produtoCatalogo.id === item.id);
            if (item.quantidade >= produto.quantidadeDisponivel) {
                const aviso = document.getElementById('luth-mensagem');
                aviso.textContent = `Há somente ${produto.quantidadeDisponivel} unidade(s) cadastrada(s) para ${produto.nome}.`;
                aviso.hidden = false;
                return;
            }
        }
        item.quantidade += Number(button.dataset.delta);
        if (item.quantidade <= 0) selecionados.delete(item.id);
        renderResumo();
    });
    document.getElementById('filtro-categoria').addEventListener('change', renderCatalogo);
    document.getElementById('busca-item').addEventListener('input', renderCatalogo);
    const seletorShow = document.getElementById('show-agendado');
    seletorShow.innerHTML = document.getElementById('shows-luthbox').innerHTML;
    seletorShow.required = true;
    function atualizarShowsDisponiveis() {
        const modalidadeAtual = document.querySelector('input[name="modalidade"]:checked').value;
        const hoje = hojeBrasilISO();
        [...seletorShow.options].forEach((opcao, indice) => {
            opcao.hidden = indice > 0 && modalidadeAtual === 'imediata' && opcao.dataset.date !== hoje;
        });
        if (seletorShow.selectedOptions[0]?.hidden) seletorShow.value = '';
        const temShow = [...seletorShow.options].some((opcao, indice) => indice > 0 && opcao.value && !opcao.hidden);
        const mensagem = document.getElementById('luth-mensagem');
        if (!temShow) {
            mensagem.textContent = modalidadeAtual === 'imediata'
                ? 'Não há show cadastrado para hoje. Para um show futuro, selecione agendamento antecipado.'
                : 'Não há shows futuros vinculados à sua banda. Peça ao administrador para configurar a escala.';
            mensagem.hidden = false;
        } else if (!seletorShow.value) {
            mensagem.textContent = 'Selecione o show em que sua banda participará.';
            mensagem.hidden = false;
        } else {
            mensagem.hidden = true;
        }
        renderResumo();
    }
    document.querySelectorAll('input[name="modalidade"]').forEach(radio => radio.addEventListener('change', atualizarShowsDisponiveis));
    atualizarShowsDisponiveis();
    seletorShow.addEventListener('change', () => {
        atualizarShowsDisponiveis();
        renderResumo();
    });
    document.getElementById('luth-finalizar').addEventListener('click', () => {
        const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
        const showSelecionado = seletorShow.options[seletorShow.selectedIndex];
        if (!showSelecionado?.value) {
            const aviso = document.getElementById('luth-mensagem');
            aviso.textContent = 'Selecione o show em que sua banda participará.';
            aviso.hidden = false;
            seletorShow.focus();
            return;
        }
        if (modalidade === 'imediata' && showSelecionado.dataset.date !== hojeBrasilISO()) {
            const aviso = document.getElementById('luth-mensagem');
            aviso.textContent = 'Solicitação imediata só pode ser vinculada a um show de hoje. Selecione agendamento antecipado para outro dia.';
            aviso.hidden = false;
            return;
        }
        const itens = [...selecionados.values()].map(({ id, quantidade }) => ({ id, quantidade }));
        const botao = document.getElementById('luth-finalizar');
        botao.disabled = true;
        botao.textContent = 'Enviando solicitação…';
        fetch('/api/luthbox/solicitacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens, modalidade, showId: showSelecionado.value })
        }).then(async resposta => {
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível enviar a solicitação.');
            window.location.href = '/luthbox/solicitacoes?enviada=1';
        }).catch(erro => {
            const aviso = document.getElementById('luth-mensagem');
            aviso.textContent = erro.message;
            aviso.hidden = false;
            botao.disabled = false;
            botao.textContent = 'Enviar para aprovação';
        });
    });
    renderCatalogo();
    renderResumo();
});
