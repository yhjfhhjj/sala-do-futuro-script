(function(){
    // Configuração visual (cores e tamanhos)
    const estilo = {
        cores: {
            principal: '#6e48fa',
            fundo: '#ffffff',
            texto: '#2d3748',
            destaque: '#f0f5ff'
        },
        tamanhos: {
            largura: '260px',
            borderRadius: '12px'
        }
    };

    // Cria o container principal
    const container = document.createElement('div');
    container.id = 'hck-blackbox-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    // Botão principal (HCK Blackbox)
    const botaoPrincipal = document.createElement('button');
    botaoPrincipal.textContent = 'HCK Blackbox';
    botaoPrincipal.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: ${estilo.tamanhos.borderRadius};
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.2s;
    `;
    botaoPrincipal.onmouseenter = () => botaoPrincipal.style.transform = 'translateY(-2px)';
    botaoPrincipal.onmouseleave = () => botaoPrincipal.style.transform = 'none';

    // Menu que aparece ao clicar
    const menu = document.createElement('div');
    menu.id = 'hck-menu';
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: ${estilo.tamanhos.largura};
        padding: 12px;
        margin-top: 8px;
        border-radius: ${estilo.tamanhos.borderRadius};
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        display: none;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease-out;
    `;

    // Área de input (onde cola a pergunta)
    const inputPergunta = document.createElement('textarea');
    inputPergunta.id = 'hck-input';
    inputPergunta.placeholder = 'Cole a questão aqui...';
    inputPergunta.style.cssText = `
        width: 100%;
        min-height: 80px;
        padding: 10px;
        margin-bottom: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        resize: vertical;
        font-size: 14px;
    `;

    // Seção de imagens (compacta)
    const secaoImagens = document.createElement('div');
    secaoImagens.id = 'hck-imagens';
    secaoImagens.style.cssText = `
        max-height: 150px;
        overflow-y: auto;
        margin-bottom: 12px;
        background: ${estilo.cores.destaque};
        border-radius: 8px;
        padding: 8px;
    `;

    // Botão de análise (estilo moderno)
    const botaoAnalisar = document.createElement('button');
    botaoAnalisar.id = 'hck-analisar';
    botaoAnalisar.innerHTML = `
        <span style="display:flex;align-items:center;gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M10 6H14M10 12H14M10 18H6V4H18V20H10V18Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            Analisar Questão
        </span>
    `;
    botaoAnalisar.style.cssText = `
        width: 100%;
        padding: 10px;
        background: ${estilo.cores.principal};
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    `;
    botaoAnalisar.onmouseenter = () => botaoAnalisar.style.background = '#5a3fd8';
    botaoAnalisar.onmouseleave = () => botaoAnalisar.style.background = estilo.cores.principal;

    // Área de resposta (hidden por padrão)
    const areaResposta = document.createElement('div');
    areaResposta.id = 'hck-resposta';
    areaResposta.style.cssText = `
        margin-top: 12px;
        padding: 12px;
        background: ${estilo.cores.destaque};
        border-radius: 8px;
        display: none;
        border-left: 3px solid ${estilo.cores.principal};
    `;

    // Monta a estrutura
    menu.append(
        inputPergunta,
        secaoImagens,
        botaoAnalisar,
        areaResposta
    );
    container.append(botaoPrincipal, menu);
    document.body.append(container);

    // Controle do menu (show/hide)
    botaoPrincipal.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        setTimeout(() => {
            menu.style.opacity = menu.style.display === 'block' ? '1' : '0';
            menu.style.transform = menu.style.display === 'block' ? 'translateY(0)' : 'translateY(10px)';
        }, 10);
    });

    document.addEventListener('click', () => {
        if (menu.style.display === 'block') {
            menu.style.opacity = '0';
            menu.style.transform = 'translateY(10px)';
            setTimeout(() => menu.style.display = 'none', 300);
        }
    });

    // ===== FUNÇÕES PÚBLICAS =====
    window.criarUI = () => {
        return {
            input: inputPergunta,
            analyzeOption: botaoAnalisar,
            imagesContainer: secaoImagens,
            responsePanel: areaResposta
        };
    };

    window.atualizarImagens = (imagens) => {
        secaoImagens.innerHTML = imagens.length ? 
            imagens.map((img, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                           padding:6px;margin-bottom:4px;background:white;border-radius:6px;">
                    <span style="font-size:13px;">Imagem ${i+1}</span>
                    <button onclick="copiarUrl(${i})" 
                            style="background:#e3f2fd;color:#1976d2;border:none;border-radius:4px;
                                   padding:4px 8px;font-size:12px;cursor:pointer;">
                        Copiar
                    </button>
                </div>
            `).join('') : `
                <div style="text-align:center;color:#64748b;padding:8px;font-size:13px;">
                    Nenhuma imagem detectada
                </div>
            `;
    };

    window.mostrarResposta = (resposta) => {
        areaResposta.innerHTML = resposta;
        areaResposta.style.display = 'block';
        areaResposta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.copiarUrl = (index) => {
        if (STATE?.images?.[index]) {
            navigator.clipboard.writeText(STATE.images[index]);
            inputPergunta.value = inputPergunta.value 
                ? `${inputPergunta.value}\n${STATE.images[index]}`
                : STATE.images[index];
            
            // Feedback visual
            const btn = secaoImagens.querySelectorAll('button')[index];
            btn.textContent = '✔ Copiado!';
            setTimeout(() => {
                btn.innerHTML = 'Copiar';
            }, 2000);
        }
    };
})();
