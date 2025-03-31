(function() {
    const estilo = {
        cores: {
            principal: '#6e48fa',
            fundo: '#fff',
            texto: '#333',
            border: '#e2e8f0',
            erro: '#ef4444'
        }
    };

    const container = document.createElement('div');
    container.id = 'hck-gemini-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        z-index: 9999;
        font-family: 'Segoe UI', sans-serif;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK Gemini';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 7px 14px;
        border: none;
        border-radius: 15px;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: 300px;
        padding: 12px;
        margin-top: 8px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none;
        border: 1px solid ${estilo.cores.border};
    `;

    const input = document.createElement('textarea');
    input.placeholder = 'Cole a questão aqui...';
    input.style.cssText = `
        width: 100%;
        min-height: 80px;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 6px;
        resize: vertical;
        font-size: 14px;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
    `;

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = '🔍 Analisar';
    analyzeBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: ${estilo.cores.principal};
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Limpar';
    clearBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #e5e7eb;
        color: ${estilo.cores.texto};
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
    `;

    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.textContent = '🔄 Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin-bottom: 10px;
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 150px;
        overflow-y: auto;
        margin-bottom: 10px;
        font-size: 13px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 6px;
        padding: 8px;
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 10px;
        background: #f8fafc;
        border-radius: 6px;
        display: none;
        font-size: 13px;
        border-left: 4px solid ${estilo.cores.principal};
        word-wrap: break-word;
    `;

    const credits = document.createElement('div');
    credits.textContent = 'Desenvolvido por Hackermoon';
    credits.style.cssText = `
        text-align: center;
        font-size: 11px;
        color: #666;
        margin-top: 8px;
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid ${estilo.cores.border};">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;" title="${img}">Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')" 
                            style="background: #e3f2fd; color: #1976d2; border: none; border-radius: 3px; padding: 3px 6px; font-size: 11px; cursor: pointer;">
                        Copiar
                    </button>
                </div>
            `).join('') : 
            '<div style="color: #666; text-align: center; padding: 8px;">Nenhuma imagem encontrada</div>';
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
        panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.principal;
    };
})();
