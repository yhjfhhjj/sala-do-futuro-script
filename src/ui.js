(function() {
    // Injetar Google Fonts (SF Pro, para estilo iOS)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const estilo = {
        cores: {
            principal: '#007AFF', // Azul iOS para o botão "HCK V5"
            fundo: 'rgba(30, 30, 47, 0.95)', // Fundo preto escuro com leve transparência
            texto: '#E5E7EB', // Texto claro para melhor visibilidade
            border: 'rgba(255, 255, 255, 0.1)', // Borda sutil e translúcida
            erro: '#FF3B30', // Vermelho iOS para erros
            analisar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa mantido
            limpar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa mantido
            atualizar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa mantido
            copiar: '#60a5fa' // Azul para o botão "Copiar URL"
        }
    };

    // Função para calcular dimensões com base na resolução
    const getResponsiveSize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const baseWidth = width < 768 ? 200 : 260;
        const baseHeight = height < 600 ? 50 : 60;
        return {
            width: `${baseWidth}px`,
            textareaHeight: `${baseHeight}px`,
            fontSize: width < 768 ? '12px' : '14px',
            buttonPadding: width < 768 ? '5px' : '6px'
        };
    };

    const container = document.createElement('div');
    container.id = 'hck-v5-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 12px;
        right: 12px;
        z-index: 9999;
        font-family: 'Inter', sans-serif;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK V5';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 16px; // Aumentado para estilo iOS
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    const menu = document.createElement('div');
    const sizes = getResponsiveSize();
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: ${sizes.width};
        padding: 10px;
        margin-top: 6px;
        border-radius: 24px; // Aumentado para estilo iOS
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        display: none;
        border: 1px solid ${estilo.cores.border};
        backdrop-filter: blur(10px); // Efeito de blur iOS
        -webkit-backdrop-filter: blur(10px);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out; // Animação suave
    `;

    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        height: ${sizes.textareaHeight};
        padding: 8px;
        margin-bottom: 8px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 12px;
        resize: none;
        font-size: ${sizes.fontSize};
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
        background: #2d2d44;
        color: ${estilo.cores.texto};
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 80px;
        overflow-y: auto;
        margin-bottom: 8px;
        font-size: ${sizes.fontSize};
        border: 1px solid ${estilo.cores.border};
        border-radius: 12px;
        padding: 6px;
        color: ${estilo.cores.texto};
    `;

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = '🔍 Analisar';
    analyzeBtn.style.cssText = `
        width: 100%;
        padding: ${sizes.buttonPadding};
        background: ${estilo.cores.analisar};
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: ${sizes.fontSize};
        font-weight: 500;
        margin-bottom: 8px;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Limpar';
    clearBtn.style.cssText = `
        width: 100%;
        padding: ${sizes.buttonPadding};
        background: ${estilo.cores.limpar};
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: ${sizes.fontSize};
        font-weight: 500;
        margin-bottom: 8px;
    `;

    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.textContent = '🔄 Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        width: 100%;
        padding: ${sizes.buttonPadding};
        background: ${estilo.cores.atualizar};
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: ${sizes.fontSize};
        font-weight: 500;
        margin-bottom: 8px;
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 6px;
        background: #2d2d44;
        border-radius: 12px;
        display: none;
        font-size: ${sizes.fontSize};
        border-left: 3px solid ${estilo.cores.principal};
        word-wrap: break-word;
        margin-bottom: 8px;
        color: ${estilo.cores.texto};
    `;

    const credits = document.createElement('div');
    credits.textContent = 'Desenvolvido por Hackermoon';
    credits.style.cssText = `
        text-align: center;
        font-size: 10px;
        color: #A1A1AA; // Cor mais clara para melhor visibilidade
        margin-top: 4px;
    `;

    menu.append(input, imagesContainer, analyzeBtn, clearBtn, updateImagesBtn, responsePanel, credits);
    container.append(toggleBtn, menu);
    document.body.append(container);

    // Animação de abrir e fechar
    toggleBtn.addEventListener('click', () => {
        if (menu.style.display === 'block') {
            menu.style.opacity = '0';
            menu.style.transform = 'translateY(10px)';
            setTimeout(() => {
                menu.style.display = 'none';
            }, 300); // Tempo da animação
        } else {
            menu.style.display = 'block';
            setTimeout(() => {
                menu.style.opacity = '1';
                menu.style.transform = 'translateY(0)';
            }, 10); // Pequeno delay para garantir que o display block seja aplicado antes da animação
        }
    });

    // Ajuste dinâmico ao redimensionar a janela
    window.addEventListener('resize', () => {
        const newSizes = getResponsiveSize();
        menu.style.width = newSizes.width;
        input.style.height = newSizes.textareaHeight;
        input.style.fontSize = newSizes.fontSize;
        analyzeBtn.style.fontSize = newSizes.fontSize;
        analyzeBtn.style.padding = newSizes.buttonPadding;
        clearBtn.style.fontSize = newSizes.fontSize;
        clearBtn.style.padding = newSizes.buttonPadding;
        updateImagesBtn.style.fontSize = newSizes.fontSize;
        updateImagesBtn.style.padding = newSizes.buttonPadding;
        imagesContainer.style.fontSize = newSizes.fontSize;
        responsePanel.style.fontSize = newSizes.fontSize;
    });

    window.createUI = () => ({
        input,
        analyzeOption: analyzeBtn,
        clearOption: clearBtn,
        updateImagesOption: updateImagesBtn,
        responsePanel,
        imagesContainer
    });

    window.updateImageButtons = (images) => {
        imagesContainer.innerHTML = images.length ? 
            images.map((img, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid ${estilo.cores.border};">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;" title="${img}">Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')" 
                            style="background: #3b3b5b; color: ${estilo.cores.copiar}; border: none; border-radius: 8px; padding: 2px 6px; font-size: 11px; cursor: pointer;">
                        Copiar URL
                    </button>
                </div>
            `).join('') : 
            `<div style="color: ${estilo.cores.texto}; text-align: center; padding: 6px;">Nenhuma imagem</div>`;
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
        panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.principal;
    };
})();
