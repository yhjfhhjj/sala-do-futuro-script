(function() {
    // Função para criar a interface do usuário
    window.createUI = function() {
        // Definir cores e estilos
        const primaryColor = '#6e8efb';
        const secondaryColor = '#a777e3';
        const darkText = '#333';
        const lightText = '#f8f9fa';
        const borderRadius = '10px';

        // Criar elementos principais
        const container = document.createElement('div');
        container.id = 'hck-container';
        container.style.cssText = `
            position: fixed;
            bottom: 15px;
            right: 15px;
            z-index: 9999;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        `;

        // Adicionar fonte Inter via Google Fonts
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        // Botão de toggle do menu (mais compacto)
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'hck-toggle-btn';
        toggleBtn.textContent = 'HCK V4';
        toggleBtn.style.cssText = `
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
            color: ${lightText};
            padding: 8px 12px;
            border-radius: ${borderRadius};
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
            font-weight: 600;
            font-size: 13px;
            text-align: center;
            transition: all 0.2s ease;
            user-select: none;
            display: inline-block;
        `;

        // Menu principal (mais compacto)
        const menu = document.createElement('div');
        menu.id = 'hck-menu';
        menu.style.cssText = `
            background: white;
            border-radius: ${borderRadius};
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            width: 280px;
            padding: 12px;
            margin-top: 8px;
            display: none;
            opacity: 0;
            transform: translateY(8px);
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        `;

        // Área de texto para a pergunta (mais compacta)
        const input = document.createElement('textarea');
        input.id = 'hck-input';
        input.placeholder = 'Cole sua pergunta aqui...';
        input.style.cssText = `
            width: 100%;
            min-height: 70px;
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            resize: vertical;
            font-family: inherit;
            font-size: 13px;
            margin-bottom: 12px;
            box-sizing: border-box;
        `;

        // Container para as imagens (mais compacto)
        const imagesContainer = document.createElement('div');
        imagesContainer.id = 'hck-images-container';
        imagesContainer.style.cssText = `
            max-height: 160px;
            overflow-y: auto;
            margin-bottom: 12px;
            border: 1px solid #f0f0f0;
            border-radius: 6px;
            padding: 4px;
            font-size: 13px;
        `;

        // Botões de ação (mais compactos)
        const actionsContainer = document.createElement('div');
        actionsContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        `;

        // Botão Analisar (estilo atualizado)
        const analyzeOption = document.createElement('button');
        analyzeOption.id = 'hck-analyze-btn';
        analyzeOption.innerHTML = '<span style="margin-right: 4px;">🔍</span>Analisar';
        analyzeOption.style.cssText = `
            flex: 1;
            padding: 8px;
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
            color: ${lightText};
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 12px;
            transition: all 0.2s;
        `;

        // Botão Limpar (estilo atualizado)
        const clearOption = document.createElement('button');
        clearOption.id = 'hck-clear-btn';
        clearOption.innerHTML = '<span style="margin-right: 4px;">🧹</span>Limpar';
        clearOption.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #f5f5f5;
            color: ${darkText};
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 12px;
            transition: all 0.2s;
        `;

        // Botão Resetar (estilo atualizado)
        const resetOption = document.createElement('button');
        resetOption.id = 'hck-reset-btn';
        resetOption.innerHTML = '<span style="margin-right: 4px;">🔄</span>Resetar';
        resetOption.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #f5f5f5;
            color: ${darkText};
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 12px;
            transition: all 0.2s;
        `;

        // Botão Atualizar Imagens (estilo atualizado)
        const updateImagesOption = document.createElement('button');
        updateImagesOption.id = 'hck-update-images-btn';
        updateImagesOption.innerHTML = '<span style="margin-right: 4px;">🖼️</span>Atualizar Imagens';
        updateImagesOption.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #f5f5f5;
            color: ${darkText};
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 12px;
            margin-bottom: 12px;
            transition: all 0.2s;
        `;

        // Painel de resposta (estilo atualizado)
        const responsePanel = document.createElement('div');
        responsePanel.id = 'hck-response-panel';
        responsePanel.style.cssText = `
            background: #f8f9fa;
            border-radius: 6px;
            padding: 10px;
            margin-top: 8px;
            display: none;
            border-left: 3px solid ${primaryColor};
            word-break: break-word;
            font-size: 13px;
        `;

        // Footer (mais compacto)
        const footer = document.createElement('div');
        footer.textContent = 'Desenvolvido por Hackermoon';
        footer.style.cssText = `
            font-size: 10px;
            color: #999;
            text-align: center;
            margin-top: 8px;
        `;

        // Efeitos hover consistentes
        const addHoverEffect = (element, hoverBg, hoverColor = null) => {
            element.addEventListener('mouseenter', () => {
                element.style.background = hoverBg;
                if (hoverColor) element.style.color = hoverColor;
                element.style.transform = 'translateY(-1px)';
            });
            element.addEventListener('mouseleave', () => {
                const originalBg = element.id.includes('analyze') 
                    ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                    : '#f5f5f5';
                element.style.background = originalBg;
                if (hoverColor) element.style.color = lightText;
                element.style.transform = 'translateY(0)';
            });
        };

        addHoverEffect(analyzeOption, `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`, lightText);
        addHoverEffect(clearOption, '#e0e0e0');
        addHoverEffect(resetOption, '#e0e0e0');
        addHoverEffect(updateImagesOption, '#e0e0e0');

        // Montar a estrutura
        actionsContainer.appendChild(analyzeOption);
        actionsContainer.appendChild(clearOption);
        actionsContainer.appendChild(resetOption);
        
        menu.appendChild(input);
        menu.appendChild(updateImagesOption);
        menu.appendChild(imagesContainer);
        menu.appendChild(actionsContainer);
        menu.appendChild(responsePanel);
        menu.appendChild(footer);
        
        container.appendChild(toggleBtn);
        container.appendChild(menu);
        document.body.appendChild(container);

        // Função para mostrar/esconder o menu
        function toggleMenu() {
            if (menu.style.display === 'block') {
                menu.style.opacity = '0';
                menu.style.transform = 'translateY(8px)';
                setTimeout(() => {
                    menu.style.display = 'none';
                }, 250);
            } else {
                menu.style.display = 'block';
                setTimeout(() => {
                    menu.style.opacity = '1';
                    menu.style.transform = 'translateY(0)';
                }, 10);
            }
        }

        // Event listeners
        toggleBtn.addEventListener('click', toggleMenu);
        
        // Fechar o menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && menu.style.display === 'block') {
                toggleMenu();
            }
        });

        // Retornar os elementos importantes para o bookmarklet
        return {
            input,
            analyzeOption,
            clearOption,
            resetOption,
            updateImagesOption,
            responsePanel,
            imagesContainer
        };
    };

    // Função para atualizar os botões de imagem (mais compacta)
    window.updateImageButtons = function(images) {
        const container = document.getElementById('hck-images-container');
        container.innerHTML = '';
        
        if (images.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = 'Nenhuma imagem encontrada';
            emptyMsg.style.cssText = 'text-align: center; color: #999; padding: 8px; font-size: 12px;';
            container.appendChild(emptyMsg);
            return;
        }
        
        images.forEach((img, index) => {
            const imageItem = document.createElement('div');
            imageItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px;
                margin-bottom: 4px;
                background: #f9f9f9;
                border-radius: 4px;
                font-size: 12px;
            `;
            
            const imageLabel = document.createElement('span');
            imageLabel.textContent = `Imagem ${index + 1}`;
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copiar URL';
            copyBtn.style.cssText = `
                background: #e3f2fd;
                color: #1976d2;
                border: none;
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            // Efeito hover para o botão de copiar
            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.background = '#bbdefb';
                copyBtn.style.transform = 'translateY(-1px)';
            });
            copyBtn.addEventListener('mouseleave', () => {
                copyBtn.style.background = '#e3f2fd';
                copyBtn.style.transform = 'translateY(0)';
            });
            
            imageItem.appendChild(imageLabel);
            imageItem.appendChild(copyBtn);
            container.appendChild(imageItem);
            
            // Armazenar referência para o botão de copiar URL
            if (!window.copyUrlOptions) window.copyUrlOptions = [];
            window.copyUrlOptions[index] = copyBtn;
        });
    };

    // Função para mostrar respostas (estilo atualizado)
    window.showResponse = function(panel, fullResponse, shortResponse) {
        panel.innerHTML = shortResponse || fullResponse;
        panel.style.display = 'block';
        panel.style.background = '#f0f4ff';
        
        if (shortResponse && fullResponse) {
            const details = document.createElement('details');
            details.style.cssText = 'font-size: 13px;';
            
            const summary = document.createElement('summary');
            summary.textContent = shortResponse;
            summary.style.cssText = 'cursor: pointer; font-weight: 500;';
            
            const fullText = document.createElement('div');
            fullText.textContent = fullResponse;
            fullText.style.marginTop = '6px';
            fullText.style.color = '#555';
            
            details.appendChild(summary);
            details.appendChild(fullText);
            panel.innerHTML = '';
            panel.appendChild(details);
        }
    };

    // Função para mostrar logs (opcional)
    window.showLog = function(panel, message) {
        console.log(`[HCK V4 Log] ${message}`);
    };
})();
