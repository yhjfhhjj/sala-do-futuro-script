(function(){
    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const CONFIG = {
        colors: {
            primary: '#6e8efb',
            secondary: '#a777e3',
            text: '#2d3748',
            light: '#ffffff',
            bgHover: '#f8f9fa'
        },
        sizes: {
            width: '270px',
            borderRadius: '10px'
        },
        font: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
        animations: {
            open: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            close: 'cubic-bezier(0.4, 0, 0, 1)'
        }
    };

    // ===== CARREGAR FONTE INTER =====
    const loadFont = () => {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    };

    // ===== ESTRUTURA PRINCIPAL =====
    const createContainer = () => {
        const container = document.createElement('div');
        container.id = 'hck-main-container';
        container.style.cssText = `
            position: fixed;
            bottom: 15px;
            right: 15px;
            z-index: 99999;
            font-family: ${CONFIG.font};
        `;
        return container;
    };

    // ===== BOTÃO TOGGLE =====
    const createToggleButton = () => {
        const toggle = document.createElement('div');
        toggle.id = 'hck-toggle-btn';
        toggle.textContent = 'HCK V4';
        toggle.style.cssText = `
            background: linear-gradient(135deg, ${CONFIG.colors.primary}, ${CONFIG.colors.secondary});
            color: ${CONFIG.colors.light};
            padding: 7px 12px;
            border-radius: ${CONFIG.sizes.borderRadius};
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: all 0.25s ease;
            user-select: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Efeito hover
        toggle.addEventListener('mouseenter', () => {
            toggle.style.transform = 'translateY(-2px)';
            toggle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });
        toggle.addEventListener('mouseleave', () => {
            toggle.style.transform = 'none';
            toggle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        });
        
        return toggle;
    };

    // ===== MENU PRINCIPAL =====
    const createMainMenu = () => {
        const menu = document.createElement('div');
        menu.id = 'hck-main-menu';
        menu.style.cssText = `
            background: ${CONFIG.colors.light};
            border-radius: ${CONFIG.sizes.borderRadius};
            width: ${CONFIG.sizes.width};
            padding: 12px;
            margin-top: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            display: none;
            opacity: 0;
            transform: translateY(5px);
        `;
        return menu;
    };

    // ===== COMPONENTES DO MENU =====
    const createTextArea = () => {
        const textarea = document.createElement('textarea');
        textarea.id = 'hck-question-input';
        textarea.placeholder = 'Cole sua pergunta aqui...';
        textarea.style.cssText = `
            width: 100%;
            min-height: 70px;
            padding: 10px;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            resize: vertical;
            font-family: inherit;
            font-size: 13px;
            transition: border 0.2s;
        `;
        textarea.addEventListener('focus', () => {
            textarea.style.borderColor = CONFIG.colors.primary;
        });
        textarea.addEventListener('blur', () => {
            textarea.style.borderColor = '#e2e8f0';
        });
        return textarea;
    };

    const createImagesContainer = () => {
        const container = document.createElement('div');
        container.id = 'hck-images-list';
        container.style.cssText = `
            max-height: 150px;
            overflow-y: auto;
            margin-bottom: 12px;
            border: 1px solid #edf2f7;
            border-radius: 6px;
            padding: 6px;
            background: #f8fafc;
        `;
        return container;
    };

    const createActionButtons = () => {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px;';
        
        const buttons = [
            { id: 'analyze', text: '🔍 Analisar', color: `linear-gradient(135deg, ${CONFIG.colors.primary}, ${CONFIG.colors.secondary})`, textColor: CONFIG.colors.light },
            { id: 'clear', text: '🧹 Limpar', color: '#f1f5f9', textColor: CONFIG.colors.text },
            { id: 'reset', text: '🔄 Resetar', color: '#f1f5f9', textColor: CONFIG.colors.text }
        ].map(btn => {
            const button = document.createElement('button');
            button.id = `hck-btn-${btn.id}`;
            button.innerHTML = btn.text;
            button.style.cssText = `
                flex: 1;
                padding: 8px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                background: ${btn.color};
                color: ${btn.textColor};
                transition: all 0.2s;
            `;
            
            // Efeito hover
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-1px)';
                if (btn.id !== 'analyze') {
                    button.style.background = '#e2e8f0';
                } else {
                    button.style.background = `linear-gradient(135deg, ${CONFIG.colors.secondary}, ${CONFIG.colors.primary})`;
                }
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'none';
                button.style.background = btn.color;
            });
            
            return button;
        });
        
        container.append(...buttons);
        return { container, buttons };
    };

    const createResponsePanel = () => {
        const panel = document.createElement('div');
        panel.id = 'hck-response-panel';
        panel.style.cssText = `
            background: #f8fafc;
            border-radius: 6px;
            padding: 10px;
            border-left: 3px solid ${CONFIG.colors.primary};
            font-size: 13px;
            display: none;
            word-break: break-word;
        `;
        return panel;
    };

    const createFooter = () => {
        const footer = document.createElement('div');
        footer.textContent = 'Desenvolvido por Hackermoon';
        footer.style.cssText = `
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            margin-top: 8px;
        `;
        return footer;
    };

    // ===== FUNÇÕES DE CONTROLE =====
    const setupMenuToggle = (toggle, menu) => {
        const openMenu = () => {
            menu.style.display = 'block';
            setTimeout(() => {
                menu.style.opacity = '1';
                menu.style.transform = 'translateY(0)';
                menu.style.transition = `all 0.35s ${CONFIG.animations.open}`;
            }, 10);
        };

        const closeMenu = () => {
            menu.style.opacity = '0';
            menu.style.transform = 'translateY(5px)';
            menu.style.transition = `all 0.25s ${CONFIG.animations.close}`;
            setTimeout(() => {
                menu.style.display = 'none';
            }, 250);
        };

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menu.style.display === 'block') closeMenu();
            else openMenu();
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                closeMenu();
            }
        });
    };

    // ===== INICIALIZAÇÃO =====
    const initUI = () => {
        loadFont();
        
        const container = createContainer();
        const toggle = createToggleButton();
        const menu = createMainMenu();
        
        const textarea = createTextArea();
        const imagesContainer = createImagesContainer();
        const { container: buttonsContainer, buttons } = createActionButtons();
        const responsePanel = createResponsePanel();
        const footer = createFooter();
        
        menu.append(
            textarea,
            imagesContainer,
            buttonsContainer,
            responsePanel,
            footer
        );
        
        container.append(toggle, menu);
        document.body.appendChild(container);
        
        setupMenuToggle(toggle, menu);
        
        return {
            input: textarea,
            analyzeOption: buttons[0],
            clearOption: buttons[1],
            resetOption: buttons[2],
            responsePanel,
            imagesContainer
        };
    };

    // ===== FUNÇÕES PÚBLICAS =====
    window.createUI = initUI;

    window.updateImageButtons = (images) => {
        const container = document.getElementById('hck-images-list');
        if (!container) return;
        
        if (images.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:8px;font-size:12px;">Nenhuma imagem encontrada</div>';
            return;
        }
        
        container.innerHTML = images.slice(0, 50).map((img, index) => `
            <div style="display:flex;justify-content:space-between;align-items:center;
                       padding:6px;margin-bottom:4px;background:#ffffff;border-radius:4px;
                       border:1px solid #edf2f7;">
                <span style="font-size:12px;">Imagem ${index + 1}</span>
                <button style="background:#e3f2fd;color:#1976d2;border:none;border-radius:4px;
                            padding:3px 8px;font-size:11px;cursor:pointer;transition:all 0.2s;"
                        onmouseover="this.style.background='#bbdefb';this.style.transform='translateY(-1px)'"
                        onmouseout="this.style.background='#e3f2fd';this.style.transform='none'">
                    Copiar URL
                </button>
            </div>
        `).join('');
    };

    window.showResponse = (panel, fullResponse, shortResponse) => {
        if (!panel) return;
        
        panel.innerHTML = shortResponse && fullResponse ? `
            <details style="cursor:pointer;">
                <summary style="font-weight:500;color:${CONFIG.colors.text};">${shortResponse}</summary>
                <div style="margin-top:6px;color:#4a5568;">${fullResponse}</div>
            </details>
        ` : (shortResponse || fullResponse);
        
        panel.style.display = 'block';
        panel.style.animation = 'fadeIn 0.3s ease';
    };

    // ===== ESTILOS ADICIONAIS =====
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        #hck-images-list::-webkit-scrollbar {
            width: 5px;
        }
        
        #hck-images-list::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
    `;
    document.head.appendChild(style);
})();
