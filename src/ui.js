(function() {
    // Injetar Google Fonts (Roboto)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const estilo = {
        cores: {
            principal: '#6e48fa', // Roxo do HCK V5
            fundo: '#fff', // Fundo branco
            texto: '#333',
            border: '#e2e8f0', // Borda cinza clara
            erro: '#ef4444',
            analisar: '#6e48fa', // Roxo para o botão Analisar
            limpar: '#a1a1aa', // Cinza para o botão Limpar
            atualizar: '#a1a1aa' // Cinza para o botão Atualizar Imagens
        }
    };

    const container = document.createElement('div');
    container.id = 'hck-v5-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 9999;
        font-family: 'Roboto', sans-serif;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK V5';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 5px 10px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: 200px;
        padding: 8px;
        margin-top: 5px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: none;
        border: 1px solid ${estilo.cores.border};
    `;

    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        height: 50px;
        padding: 5px;
        margin-bottom: 6px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 4px;
        resize: none;
        font-size: 12px;
        font-family: 'Roboto', sans-serif;
        box-sizing: border-box;
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 80px;
        overflow-y: auto;
        margin-bottom: 6px;
        font-size: 11px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 4px;
        padding: 5px;
    `;

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = '🔍 Analisar';
    analyzeBtn.style.cssText = `
        width: 100%;
        padding: 5px;
        background: ${estilo.cores.analisar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 6px;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Limpar';
    clearBtn.style.cssText = `
        width: 100%;
        padding: 5px;
        background: ${estilo.cores.limpar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 6px;
    `;

    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.textContent = '🔄 Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        width: 100%;
        padding: 5px;
        background: ${estilo.cores.atualizar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 6px;
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 6px;
        background: #f8fafc;
        border-radius: 4px;
        display: none;
        font-size: 11px;
        border-left: 3px solid ${estilo.cores.principal};
        word-wrap: break-word;
        margin-bottom: 6px;
    `;

    const credits = document.createElement('div');
    credits.textContent = 'Desenvolvido por Hackermoon';
    credits.style.cssText = `
        text-align: center;
        font-size: 9px;
        color: #666;
        margin-top: 4px;
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid ${estilo.cores.border};">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;" title="${img}">Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')" 
                            style="background: #e3f2fd; color: #1976d2; border: none; border-radius: 3px; padding: 2px 4px; font-size: 10px; cursor: pointer;">
                        Copiar URL
                    </button>
                </div>
            `).join('') : 
            '<div style="color: #666; text-align: center; padding: 5px;">Nenhuma imagem</div>';
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
        panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.principal;
    };
})();
