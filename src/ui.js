(function(){
    // Configurações de estilo
    const COLORS = {
        primary: '#6e48fb',
        secondary: '#9c42f5',
        text: '#2d3748',
        light: '#ffffff'
    };

    // Carregar fonte Inter
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Container principal
    const container = document.createElement('div');
    container.id = 'hck-container';
    container.style.cssText = `
        position: fixed;
        bottom: 12px;
        right: 12px;
        z-index: 9999;
        font-family: 'Inter', sans-serif;
    `;

    // Botão toggle
    const toggleBtn = document.createElement('div');
    toggleBtn.textContent = 'HCK V4';
    toggleBtn.style.cssText = `
        background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
        color: ${COLORS.light};
        padding: 5px 10px;
        border-radius: 16px;
        cursor: pointer;
        font-weight: 500;
        font-size: 11px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        display: inline-block;
    `;

    // Menu principal (compacto)
    const menu = document.createElement('div');
    menu.id = 'hck-menu';
    menu.style.cssText = `
        background: ${COLORS.light};
        border-radius: 8px;
        width: 240px;
        padding: 8px;
        margin-top: 6px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: none;
        opacity: 0;
        transform: translateY(3px);
        transition: all 0.2s ease-out;
    `;

    // Área de texto
    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        min-height: 50px;
        padding: 6px;
        margin-bottom: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 11px;
        resize: vertical;
    `;

    // Container de imagens (rolável)
    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 100px;
        overflow-y: auto;
        margin-bottom: 8px;
        font-size: 11px;
        border: 1px solid #edf2f7;
        border-radius: 6px;
        padding: 4px;
    `;

    // Botões de ação
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 5px; margin-bottom: 8px;';

    const analyzeBtn = document.createElement('button');
    analyzeBtn.innerHTML = '🔍 Analisar';
    analyzeBtn.style.cssText = `
        flex: 1;
        padding: 5px;
        background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 11px;
        cursor: pointer;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '🧹 Limpar';
    clearBtn.style.cssText = `
        flex: 1;
        padding: 5px;
        background: #f1f5f9;
        border: none;
        border-radius: 5px;
        font-size: 11px;
        cursor: pointer;
    `;

    btnContainer.append(analyzeBtn, clearBtn);

    // Painel de resposta
    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        background: #f8fafc;
        border-radius: 5px;
        padding: 6px;
        font-size: 11px;
        border-left: 2px solid ${COLORS.primary};
        display: none;
    `;

    // Montar estrutura
    menu.append(input, imagesContainer, btnContainer, responsePanel);
    container.append(toggleBtn, menu);
    document.body.append(container);

    // Controle do menu
    toggleBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        setTimeout(() => {
            menu.style.opacity = menu.style.opacity === '1' ? '0' : '1';
            menu.style.transform = menu.style.transform === 'translateY(0)' ? 'translateY(3px)' : 'translateY(0)';
        }, 10);
    });

    // ===== API para o bookmarklet =====
    window.createUI = () => ({
        input,
        analyzeOption: analyzeBtn,
        clearOption: clearBtn,
        responsePanel,
        imagesContainer
    });

    window.updateImageButtons = (images) => {
        imagesContainer.innerHTML = images.length ? 
            images.map((img, i) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 3px;
                    margin-bottom: 2px;
                    background: #fff;
                    border-radius: 3px;
                `;
                
                const label = document.createElement('span');
                label.textContent = `Imagem ${i+1}`;
                label.style.cssText = 'font-size: 10px;';
                
                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copiar';
                copyBtn.style.cssText = `
                    background: #e3f2fd;
                    color: #1976d2;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 4px;
                    font-size: 9px;
                    cursor: pointer;
                `;
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(img).then(() => {
                        input.value = input.value.trim() ? `${input.value}\n${img}` : img;
                    });
                });
                
                item.append(label, copyBtn);
                return item.outerHTML;
            }).join('') : '<div style="text-align:center;color:#94a3b8;padding:4px;font-size:10px;">Nenhuma imagem encontrada</div>';
    };

    window.showResponse = (panel, full, short) => {
        panel.innerHTML = short || full;
        panel.style.display = 'block';
    };
})();
