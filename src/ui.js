(function(){
    // Configurações de estilo
    const COLORS = {
        primary: '#6e48fb',
        secondary: '#9c42f5',
        text: '#2d3748',
        light: '#ffffff',
        bgHover: '#f0f5ff'
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
        bottom: 15px;
        right: 15px;
        z-index: 9999;
        font-family: 'Inter', sans-serif;
    `;

    // Botão toggle
    const toggleBtn = document.createElement('div');
    toggleBtn.textContent = 'HCK V4';
    toggleBtn.style.cssText = `
        background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
        color: ${COLORS.light};
        padding: 6px 12px;
        border-radius: 18px;
        cursor: pointer;
        font-weight: 500;
        font-size: 12px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        display: inline-block;
        transition: all 0.2s;
    `;
    toggleBtn.addEventListener('mouseenter', () => toggleBtn.style.transform = 'translateY(-2px)');
    toggleBtn.addEventListener('mouseleave', () => toggleBtn.style.transform = 'none');

    // Menu principal
    const menu = document.createElement('div');
    menu.id = 'hck-menu';
    menu.style.cssText = `
        background: ${COLORS.light};
        border-radius: 10px;
        width: 280px;
        padding: 10px;
        margin-top: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        display: none;
        opacity: 0;
        transform: translateY(5px);
        transition: all 0.25s cubic-bezier(0.2, 0, 0, 1.1);
        max-height: 70vh;
        overflow: hidden;
    `;

    // Área de texto
    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        min-height: 60px;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 12px;
        resize: vertical;
        transition: border 0.2s;
    `;
    input.addEventListener('focus', () => input.style.borderColor = COLORS.primary);
    input.addEventListener('blur', () => input.style.borderColor = '#e2e8f0');

    // Container de imagens (com scroll)
    const imagesContainer = document.createElement('div');
    imagesContainer.id = 'hck-images-container';
    imagesContainer.style.cssText = `
        max-height: 150px;
        overflow-y: auto;
        margin-bottom: 10px;
        border: 1px solid #edf2f7;
        border-radius: 8px;
        padding: 5px;
        background: #f8fafc;
    `;

    // Botões de ação
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 8px; margin-bottom: 10px;';

    const analyzeBtn = document.createElement('button');
    analyzeBtn.innerHTML = '<span style="margin-right:4px">🔍</span> Analisar';
    analyzeBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '<span style="margin-right:4px">🧹</span> Limpar';
    clearBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #f1f5f9;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
    `;

    btnContainer.append(analyzeBtn, clearBtn);

    // Painel de resposta
    const responsePanel = document.createElement('div');
    responsePanel.id = 'hck-response';
    responsePanel.style.cssText = `
        background: #f8fafc;
        border-radius: 8px;
        padding: 10px;
        font-size: 12px;
        border-left: 3px solid ${COLORS.primary};
        display: none;
        margin-bottom: 8px;
    `;

    // Footer
    const footer = document.createElement('div');
    footer.textContent = 'Desenvolvido por Hackermoon';
    footer.style.cssText = `
        font-size: 10px;
        color: #94a3b8;
        text-align: center;
        margin-top: 8px;
    `;

    // Montar estrutura
    menu.append(input, imagesContainer, btnContainer, responsePanel, footer);
    container.append(toggleBtn, menu);
    document.body.append(container);

    // Controle do menu
    toggleBtn.addEventListener('click', toggleMenu);
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) closeMenu();
    });

    function toggleMenu() {
        if (menu.style.display === 'block') closeMenu();
        else openMenu();
    }

    function openMenu() {
        menu.style.display = 'block';
        setTimeout(() => {
            menu.style.opacity = '1';
            menu.style.transform = 'translateY(0)';
        }, 10);
    }

    function closeMenu() {
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(5px)';
        setTimeout(() => menu.style.display = 'none', 200);
    }

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
            images.map((img, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                           padding:6px;margin-bottom:4px;background:#fff;border-radius:5px;
                           border:1px solid #e2e8f0;font-size:12px;">
                    <span>Imagem ${i+1}</span>
                    <button onclick="copyImageUrl(${i})"
                            style="background:#e3f2fd;color:#1976d2;border:none;border-radius:4px;
                                   padding:3px 8px;font-size:11px;cursor:pointer;
                                   transition:all 0.2s;" 
                            onmouseover="this.style.background='#bbdefb'" 
                            onmouseout="this.style.background='#e3f2fd'">
                        Copiar URL
                    </button>
                </div>
            `).join('') : '<div style="text-align:center;color:#94a3b8;padding:8px;font-size:12px;">Nenhuma imagem encontrada</div>';
    };

    window.copyImageUrl = (index) => {
        if (STATE.images[index]) {
            navigator.clipboard.writeText(STATE.images[index]).then(() => {
                const currentText = input.value.trim();
                input.value = currentText ? `${currentText}\n${STATE.images[index]}` : STATE.images[index];
                window.showResponse(responsePanel, '', `URL da Imagem ${index+1} copiada!`);
            });
        }
    };

    window.showResponse = (panel, full, short) => {
        panel.innerHTML = short && full ? `
            <details style="cursor:pointer;">
                <summary style="font-weight:500;">${short}</summary>
                <div style="margin-top:6px;color:#4a5568;">${full}</div>
            </details>
        ` : (short || full);
        panel.style.display = 'block';
    };
})();
