(function(){
    // Configurações de estilo
    const COLORS = {
        primary: '#6e48fb',
        secondary: '#9c42f5',
        text: '#2d3748',
        light: '#ffffff',
        dark: '#1a202c'
    };

    // Carregar fonte Inter
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Criar container principal
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
    toggleBtn.id = 'hck-toggle';
    toggleBtn.textContent = 'HCK V4';
    toggleBtn.style.cssText = `
        background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
        color: ${COLORS.light};
        padding: 6px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
        user-select: none;
    `;

    // Menu principal (compacto)
    const menu = document.createElement('div');
    menu.id = 'hck-menu';
    menu.style.cssText = `
        background: ${COLORS.light};
        border-radius: 12px;
        width: 260px;
        padding: 10px;
        margin-top: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        display: none;
        opacity: 0;
        transform: translateY(5px);
        transition: all 0.25s cubic-bezier(0.2, 0, 0, 1.1);
    `;

    // Área de texto (compacta)
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
        outline: none;
        transition: border 0.2s;
    `;
    input.addEventListener('focus', () => input.style.borderColor = COLORS.primary);
    input.addEventListener('blur', () => input.style.borderColor = '#e2e8f0');

    // Container de imagens (ultra-compacto)
    const imagesContainer = document.createElement('div');
    imagesContainer.id = 'hck-images';
    imagesContainer.style.cssText = `
        max-height: 120px;
        overflow-y: auto;
        margin-bottom: 10px;
        font-size: 11px;
    `;

    // Botões de ação (compactos)
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 6px; margin-bottom: 10px;';

    const analyzeBtn = createButton('🔍 Analisar', `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, COLORS.light);
    const clearBtn = createButton('🧹 Limpar', '#f1f5f9', COLORS.text);
    const resetBtn = createButton('🔄 Resetar', '#f1f5f9', COLORS.text);

    btnContainer.append(analyzeBtn, clearBtn, resetBtn);

    // Painel de resposta (compacto)
    const responsePanel = document.createElement('div');
    responsePanel.id = 'hck-response';
    responsePanel.style.cssText = `
        background: #f8fafc;
        border-radius: 6px;
        padding: 8px;
        font-size: 12px;
        border-left: 3px solid ${COLORS.primary};
        display: none;
    `;

    // Footer minimalista
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

    // Função auxiliar para criar botões
    function createButton(text, bgColor, textColor) {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.style.cssText = `
            flex: 1;
            padding: 6px;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            background: ${bgColor};
            color: ${textColor};
            transition: all 0.15s;
        `;
        btn.onmouseenter = () => {
            btn.style.transform = 'translateY(-1px)';
            if (bgColor.includes('gradient')) {
                btn.style.background = `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})`;
            } else {
                btn.style.background = '#e2e8f0';
            }
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'none';
            btn.style.background = bgColor;
        };
        return btn;
    }

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
        setTimeout(() => menu.style.display = 'none', 150);
    }

    // ===== API para o bookmarklet =====
    window.createUI = () => ({
        input,
        analyzeOption: analyzeBtn,
        clearOption: clearBtn,
        resetOption: resetBtn,
        responsePanel,
        imagesContainer
    });

    window.updateImageButtons = (images) => {
        imagesContainer.innerHTML = images.length ? 
            images.map((img, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                           padding:4px;margin-bottom:3px;background:#fff;border-radius:4px;
                           border:1px solid #edf2f7;">
                    <span>Imagem ${i+1}</span>
                    <button onclick="navigator.clipboard.writeText('${img}')"
                            style="background:#e3f2fd;color:#1976d2;border:none;border-radius:3px;
                                   padding:2px 5px;font-size:10px;cursor:pointer;">
                        Copiar
                    </button>
                </div>
            `).join('') : '<div style="text-align:center;color:#94a3b8;padding:6px;">Nenhuma imagem</div>';
    };

    window.showResponse = (panel, full, short) => {
        panel.innerHTML = short && full ? `
            <details style="cursor:pointer;">
                <summary style="font-weight:500;">${short}</summary>
                <div style="margin-top:4px;color:#4a5568;">${full}</div>
            </details>
        ` : (short || full);
        panel.style.display = 'block';
    };
})();
