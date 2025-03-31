(function() {
    // Injetar Google Fonts (Roboto)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const estilo = {
        cores: {
            principal: '#6e48fa',
            fundo: '#fff',
            texto: '#333',
            border: '#e2e8f0',
            erro: '#ef4444',
            atualizar: '#ff6f61',
            analisar: '#ff6f61',
            limpar: '#ff6f61'
        }
    };

    const container = document.createElement('div');
    container.id = 'hck-v5-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        z-index: 9999;
        font-family: 'Roboto', sans-serif;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK V5';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: 220px;
        padding: 10px;
        margin-top: 6px;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        display: none;
        border: 1px solid ${estilo.cores.border};
    `;

    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        height: 60px;
        padding: 6px;
        margin-bottom: 8px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 4px;
        resize: none;
        font-size: 13px;
        font-family: 'Roboto', sans-serif;
        box-sizing: border-box;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 6px;
        margin-bottom: 8px;
    `;

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = '🔍 Analisar';
    analyzeBtn.style.cssText = `
        flex: 1;
        padding: 6px;
        background: ${estilo.cores.analisar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Limpar';
    clearBtn.style.cssText = `
        flex: 1;
        padding: 6px;
        background: ${estilo.cores.limpar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
    `;

    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.textContent = '🔄 Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        width: 100%;
        padding: 6px;
        background: ${estilo.cores.atualizar};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 8px;
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 100px;
        overflow-y: auto;
        margin-bottom: 8px;
        font-size: 12px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 4px;
        padding: 6px;
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 8px;
        background: #f8fafc;
        border-radius: 4px;
        display: none;
        font-size: 12px;
        border-left: 3px solid ${estilo.cores.principal};
        word-wrap: break-word;
    `;

    const credits = document.createElement('div');
    credits.textContent = 'Desenvolvido por Hackermoon';
    credits.style.cssText = `
        text-align: center;
        font-size: 10px;
        color: #666;
        margin-top: 6px;
    `;

    buttonContainer.append(analyzeBtn, clearBtn);
    menu.append(input, buttonContainer, updateImagesBtn, imagesContainer, responsePanel, credits);
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid ${estilo.cores.border};">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;" title="${img}">Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')" 
                            style="background: #e3f2fd; color: #1976d2; border: none; border-radius: 3px; padding: 2px 5px; font-size: 11px; cursor: pointer;">
                        Copiar URL
                    </button>
                </div>
            `).join('') : 
            '<div style="color: #666; text-align: center; padding: 6px;">Nenhuma imagem encontrada</div>';
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
        panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.principal;
    };
})();
