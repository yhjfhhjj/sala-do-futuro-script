(function() {
    // Injetar Google Fonts (Roboto)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const estilo = {
        cores: {
            principal: '#a855f7', // Roxo do gradiente
            fundo: '#1e1e2f', // Fundo escuro do menu
            texto: '#d1d5db', // Texto claro
            border: '#4b5563', // Borda cinza escura
            erro: '#ef4444',
            analisar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa
            limpar: 'linear-gradient(to right, #ff6f61, #a855f7)', // Gradiente roxo-rosa
            atualizar: 'linear-gradient(to right, #ff6f61, #a855f7)' // Gradiente roxo-rosa
        }
    };

    const container = document.createElement('div');
    container.id = 'hck-v5-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 8px;
        right: 8px;
        z-index: 9999;
        font-family: 'Roboto', sans-serif;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK V5';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 4px 8px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: 180px;
        padding: 6px;
        margin-top: 4px;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        display: none;
        border: 1px solid ${estilo.cores.border};
    `;

    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        height: 40px;
        padding: 4px;
        margin-bottom: 4px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 4px;
        resize: none;
        font-size: 11px;
        font-family: 'Roboto', sans-serif;
        box-sizing: border-box;
        background: #2d2d44;
        color: ${estilo.cores.texto};
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 60px;
        overflow-y: auto;
        margin-bottom: 4px;
        font-size: 10px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 4px;
        padding: 4px;
        color: ${estilo.cores.texto};
    `;

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = 'Analisar';
    analyzeBtn.style.cssText = `
        width: 100%;
        padding: 4px;
        background: ${estilo.cores.analisar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        margin-bottom: 4px;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Limpar';
    clearBtn.style.cssText = `
        width: 100%;
        padding: 4px;
        background: ${estilo.cores.limpar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        margin-bottom: 4px;
    `;

    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.textContent = 'Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        width: 100%;
        padding: 4px;
        background: ${estilo.cores.atualizar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        margin-bottom: 4px;
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 4px;
        background: #2d2d44;
        border-radius: 4px;
        display: none;
        font-size: 10px;
        border-left: 3px solid ${estilo.cores.principal};
        word-wrap: break-word;
        margin-bottom: 4px;
        color: ${estilo.cores.texto};
    `;

    const credits = document.createElement('div');
    credits.textContent = 'Desenvolvido por Hackermoon';
    credits.style.cssText = `
        text-align: center;
        font-size: 8px;
        color: ${estilo.cores.texto};
        margin-top: 2px;
    `;

    menu.append(input, imagesContainer, analyzeBtn, clearBtn, updateImagesBtn, responsePanel, credits);
    container.append(toggleBtn, menu);
    document.body.append(container);

    toggleBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid ${estilo.cores.border};">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;" title="${img}">Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')" 
                            style="background: #3b3b5b; color: #60a5fa; border: none; border-radius: 3px; padding: 1px 3px; font-size: 9px; cursor: pointer;">
                        Copiar URL
                    </button>
                </div>
            `).join('') : 
            '<div style="color: ${estilo.cores.texto}; text-align: center; padding: 4px;">Nenhuma imagem</div>';
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
        panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.principal;
    };
})();
