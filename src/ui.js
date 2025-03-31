(function() {
    // Função para criar a interface do usuário
    window.createUI = function() {
        // Criar elementos principais
        const container = document.createElement('div');
        container.id = 'hck-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        `;

        // Botão de toggle do menu
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'hck-toggle-btn';
        toggleBtn.textContent = 'HCK V4';
        toggleBtn.style.cssText = `
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-weight: 600;
            text-align: center;
            transition: all 0.3s ease;
            user-select: none;
        `;
        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.transform = 'translateY(-2px)';
            toggleBtn.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
        });
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.transform = 'translateY(0)';
            toggleBtn.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        });

        // Menu principal
        const menu = document.createElement('div');
        menu.id = 'hck-menu';
        menu.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            width: 300px;
            padding: 15px;
            margin-top: 10px;
            display: none;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        // Área de texto para a pergunta
        const input = document.createElement('textarea');
        input.id = 'hck-input';
        input.placeholder = 'Cole sua pergunta aqui...';
        input.style.cssText = `
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            resize: vertical;
            font-family: inherit;
            margin-bottom: 15px;
            box-sizing: border-box;
        `;

        // Container para as imagens
        const imagesContainer = document.createElement('div');
        imagesContainer.id = 'hck-images-container';
        imagesContainer.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
            padding: 5px;
        `;

        // Botões de ação
        const actionsContainer = document.createElement('div');
        actionsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        `;

        // Botão Analisar
        const analyzeOption = document.createElement('button');
        analyzeOption.id = 'hck-analyze-btn';
        analyzeOption.innerHTML = '<span style="margin-right: 4px;">🔍</span>Analisar';
        analyzeOption.style.cssText = `
            flex: 1;
            padding: 10px;
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: opacity 0.2s;
        `;

        // Botão Limpar
        const clearOption = document.createElement('button');
        clearOption.id = 'hck-clear-btn';
        clearOption.innerHTML = '<span style="margin-right: 4px;">🧹</span>Limpar';
        clearOption.style.cssText = `
            flex: 1;
            padding: 10px;
            background: #f5f5f5;
            color: #555;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        `;
        clearOption.addEventListener('mouseenter', () => {
            clearOption.style.background = '#e0e0e0';
        });
        clearOption.addEventListener('mouseleave', () => {
            clearOption.style.background = '#f5f5f5';
        });

        // Botão Resetar
        const resetOption = document.createElement('button');
        resetOption.id = 'hck-reset-btn';
        resetOption.innerHTML = '<span style="margin-right: 4px;">🔄</span>Resetar';
        resetOption.style.cssText = `
            flex: 1;
            padding: 10px;
            background: #f5f5f5;
            color: #555;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        `;
        resetOption.addEventListener('mouseenter', () => {
            resetOption.style.background = '#e0e0e0';
        });
        resetOption.addEventListener('mouseleave', () => {
            resetOption.style.background = '#f5f5f5';
        });

        // Botão Atualizar Imagens
        const updateImagesOption = document.createElement('button');
        updateImagesOption.id = 'hck-update-images-btn';
        updateImagesOption.innerHTML = '<span style="margin-right: 4px;">🖼️</span>Atualizar Imagens';
        updateImagesOption.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #f5f5f5;
            color: #555;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            margin-bottom: 15px;
            transition: background 0.2s;
        `;
        updateImagesOption.addEventListener('mouseenter', () => {
            updateImagesOption.style.background = '#e0e0e0';
        });
        updateImagesOption.addEventListener('mouseleave', () => {
            updateImagesOption.style.background = '#f5f5f5';
        });

        // Painel de resposta
        const responsePanel = document.createElement('div');
        responsePanel.id = 'hck-response-panel';
        responsePanel.style.cssText = `
            background: #f8f9fa;
            border-radius: 8px;
            padding: 12px;
            margin-top: 10px;
            display: none;
            border-left: 4px solid #6e8efb;
            word-break: break-word;
        `;

        // Footer
        const footer = document.createElement('div');
        footer.textContent = 'Desenvolvido por Hackermoon';
        footer.style.cssText = `
            font-size: 11px;
            color: #999;
            text-align: center;
            margin-top: 10px;
        `;

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
                menu.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    menu.style.display = 'none';
                }, 300);
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

    // Função para atualizar os botões de imagem
    window.updateImageButtons = function(images) {
        const container = document.getElementById('hck-images-container');
        container.innerHTML = '';
        
        if (images.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = 'Nenhuma imagem encontrada';
            emptyMsg.style.cssText = 'text-align: center; color: #999; padding: 10px;';
            container.appendChild(emptyMsg);
            return;
        }
        
        images.forEach((img, index) => {
            const imageItem = document.createElement('div');
            imageItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                margin-bottom: 5px;
                background: #f9f9f9;
                border-radius: 6px;
            `;
            
            const imageLabel = document.createElement('span');
            imageLabel.textContent = `Imagem ${index + 1}`;
            imageLabel.style.cssText = 'font-size: 14px;';
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copiar URL';
            copyBtn.style.cssText = `
                background: #e3f2fd;
                color: #1976d2;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.background = '#bbdefb';
            });
            copyBtn.addEventListener('mouseleave', () => {
                copyBtn.style.background = '#e3f2fd';
            });
            
            imageItem.appendChild(imageLabel);
            imageItem.appendChild(copyBtn);
            container.appendChild(imageItem);
            
            // Armazenar referência para o botão de copiar URL
            if (!window.copyUrlOptions) window.copyUrlOptions = [];
            window.copyUrlOptions[index] = copyBtn;
        });
    };

    // Função para mostrar respostas
    window.showResponse = function(panel, fullResponse, shortResponse) {
        panel.innerHTML = shortResponse || fullResponse;
        panel.style.display = 'block';
        
        if (shortResponse && fullResponse) {
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = shortResponse;
            summary.style.cssText = 'cursor: pointer;';
            
            const fullText = document.createElement('div');
            fullText.textContent = fullResponse;
            fullText.style.marginTop = '8px';
            
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
