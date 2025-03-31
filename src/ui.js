(function() {
    // Injetar Google Fonts (Roboto)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const estilo = {
        cores: {
            principal: '#a855f7', // Roxo do gradiente
            fundo: '#1e1e2f', // Fundo preto escuro
            texto: '#d1d5db', // Texto claro
            border: '#4b5563', // Borda cinza escura
            erro: '#ef4444',
            analisar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa
            limpar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa
            atualizar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa
            copiar: '#60a5fa' // Azul para o botão "Copiar URL"
        }
    };

    // Função para calcular dimensões com base na resolução
    const getResponsiveSize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const baseWidth = width < 768 ? 240 : 320; // Aumentado: 220 -> 240 (mobile), 280 -> 320 (desktop)
        const baseHeight = height < 600 ? 60 : 70; // Aumentado: 50 -> 60 (mobile), 60 -> 70 (desktop)
        return {
            width: `${baseWidth}px`,
            textareaHeight: `${baseHeight}px`,
            fontSize: width < 768 ? '13px' : '15px', // Aumentado: 12px -> 13px (mobile), 14px -> 15px (desktop)
            buttonPadding: width < 768 ? '6px' : '8px' // Aumentado: 5px -> 6px (mobile), 6px -> 8px (desktop)
        };
    };

    const container = document.createElement('div');
    container.id = 'hck-v5-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 12px;
        right: 12px;
        z-index: 9999;
        font-family: 'Roboto', sans-serif;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK V5';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 8px 14px; // Aumentado: 6px 12px -> 8px 14px
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 500;
        font-size: 15px; // Aumentado: 14px -> 15px
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    const menu = document.createElement('div');
    const sizes = getResponsiveSize();
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: ${sizes.width};
        padding: 12px; // Aumentado: 10px -> 12px
        margin-top: 8px; // Aumentado: 6px -> 8px
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        display: none;
        border: 1px solid ${estilo.cores.border};
    `;

    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        height: ${sizes.textareaHeight};
        padding: 10px; // Aumentado: 8px -> 10px
        margin-bottom: 10px; // Aumentado: 8px -> 10px
        border: 1px solid ${estilo.cores.border};
        border-radius: 8px;
        resize: none;
        font-size: ${sizes.fontSize};
        font-family: 'Roboto', sans-serif;
        box-sizing: border-box;
        background: #2d2d44;
        color: ${estilo.cores.texto};
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 100px; // Aumentado: 80px -> 100px
        overflow-y: auto;
        margin-bottom: 10px; // Aumentado: 8px -> 10px
        font-size: ${sizes.fontSize};
        border: 1px solid ${estilo.cores.border};
        border-radius: 8px;
        padding: 8px; // Aumentado: 6px -> 8px
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
        border-radius: 8px;
        cursor: pointer;
        font-size: ${sizes.fontSize};
        font-weight: 500;
        margin-bottom: 10px; // Aumentado: 8px -> 10px
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Limpar';
    clearBtn.style.cssText = `
        width: 100%;
        padding: ${sizes.buttonPadding};
        background: ${estilo.cores.limpar};
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: ${sizes.fontSize};
        font-weight: 500;
        margin-bottom: 10px; // Aumentado: 8px -> 10px
    `;

    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.textContent = '🔄 Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        width: 100%;
        padding: ${sizes.buttonPadding};
        background: ${estilo.cores.atualizar};
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: ${sizes.fontSize};
        font-weight: 500;
        margin-bottom: 10px; // Aumentado: 8px -> 10px
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 8px; // Aumentado: 6px -> 8px
        background: #2d2d44;
        border-radius: 8px;
        display: none;
        font-size: ${sizes.fontSize};
        border-left: 3px solid ${estilo.cores.principal};
        word-wrap: break-word;
        margin-bottom: 10px; // Aumentado: 8px -> 10px
        color: ${estilo.cores.texto};
    `;

    const credits = document.createElement('div');
    credits.textContent = 'Desenvolvido por Hackermoon';
    credits.style.cssText = `
        text-align: center;
        font-size: 11px; // Aumentado: 10px -> 11px
        color: ${estilo.cores.texto};
        margin-top: 6px; // Aumentado: 4px -> 6px
    `;

    menu.append(input, imagesContainer, analyzeBtn, clearBtn, updateImagesBtn, responsePanel, credits);
    container.append(toggleBtn, menu);
    document.body.append(container);

    toggleBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid ${estilo.cores.border};">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;" title="${img}">Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')" 
                            style="background: #3b3b5b; color: ${estilo.cores.copiar}; border: none; border-radius: 4px; padding: 3px 8px; font-size: 12px; cursor: pointer;">
                        Copiar URL
                    </button>
                </div>
            `).join('') : 
            `<div style="color: ${estilo.cores.texto}; text-align: center; padding: 8px;">Nenhuma imagem</div>`;
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
        panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.principal;
    };
})();
