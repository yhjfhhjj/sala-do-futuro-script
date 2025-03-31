function createUI() {
    if (window.location.hostname !== 'saladofuturo.educacao.sp.gov.br') return;

    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

    // Estado para as cores
    let currentTheme = {
        menuBg: '#1C2526',
        menuText: '#FFFFFF',
        buttonBg: '#333333',
        buttonText: '#FFFFFF',
        panelBg: '#1C2526',
        panelText: '#FFFFFF'
    };

    const container = document.createElement('div');
    container.id = 'gemini-helper-container';
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'Arial, sans-serif'
    });

    const menuBtn = document.createElement('button');
    menuBtn.id = 'gemini-menu-btn';
    menuBtn.innerHTML = 'HCK V3';
    Object.assign(menuBtn.style, {
        padding: '8px 12px',
        background: currentTheme.buttonBg,
        color: currentTheme.buttonText,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        transition: 'background 0.3s ease',
        alignSelf: 'flex-end'
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.background = '#555555';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.background = currentTheme.buttonBg;
    };

    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: currentTheme.menuBg,
        color: currentTheme.menuText,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
        position: 'fixed',
        bottom: '50px',
        right: '10px',
        flexDirection: 'column',
        gap: '10px',
        width: '280px',
        maxWidth: '90vw',
        border: '1px solid #333333'
    });

    if (window.innerWidth > 600) {
        menu.style.width = '320px';
    }

    const menuTitle = document.createElement('div');
    menuTitle.innerHTML = 'HCK V3';
    Object.assign(menuTitle.style, {
        color: currentTheme.menuText,
        fontSize: '16px',
        fontWeight: '600',
        textAlign: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid #444444'
    });

    const corsWarning = document.createElement('div');
    corsWarning.innerHTML = '⚠️ Instale a extensão "CORS Unblock" para melhor funcionamento.';
    Object.assign(corsWarning.style, {
        color: '#FF5555',
        fontSize: '12px',
        textAlign: 'center',
        padding: '6px',
        background: '#2A2F30',
        borderRadius: '4px',
        marginBottom: '8px'
    });

    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole a questão aqui...';
    Object.assign(input.style, {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #444444',
        background: '#2A2F30',
        fontSize: '14px',
        color: currentTheme.menuText,
        outline: 'none',
        resize: 'vertical',
        minHeight: '60px',
        maxHeight: '100px',
        width: '100%',
        transition: 'border-color 0.3s ease',
        fontFamily: 'Arial, sans-serif'
    });
    input.onfocus = () => {
        input.style.borderColor = '#666666';
    };
    input.onblur = () => {
        input.style.borderColor = '#444444';
    };

    const imagesSection = document.createElement('div');
    imagesSection.id = 'gemini-images-section';
    Object.assign(imagesSection.style, {
        maxHeight: '120px',
        overflowY: 'auto',
        padding: '6px',
        background: '#2A2F30',
        borderRadius: '4px',
        border: '1px solid #444444',
        fontSize: '12px',
        color: currentTheme.menuText,
        fontFamily: 'Arial, sans-serif'
    });

    function loadImages() {
        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => {
                if (!src || !src.startsWith('http')) return false;
                const blocked = [
                    /edusp-static\.ip\.tv\/sala-do-futuro\//i,
                    /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
                    /conteudo_logo\.png$/i,
                    /\/icons?\//i,
                    /\/logos?\//i,
                    /\/buttons?\//i,
                    /\/assets\//i
                ];
                const allowed = [
                    /edusp-static\.ip\.tv\/tms\//i,
                    /edusp-static\.ip\.tv\/tarefas\//i,
                    /edusp-static\.ip\.tv\/exercicios\//i,
                    /\/atividade\/\d+\?eExame=true/i,
                    /\.(jpg|png|jpeg|gif|webp)$/i,
                    /lh7-rt\.googleusercontent\.com/i // Novo padrão para Google URLs
                ];
                return !blocked.some(pattern => pattern.test(src)) && allowed.some(pattern => pattern.test(src));
            })
            .slice(0, 50);

        imagesSection.innerHTML = '';

        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '<span style="margin-right: 4px;">🔄</span>Atualizar Imagens';
        Object.assign(refreshBtn.style, {
            width: '100%',
            padding: '6px',
            background: currentTheme.buttonBg,
            color: currentTheme.buttonText,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            textAlign: 'center',
            marginBottom: '6px',
            transition: 'background 0.3s ease'
        });
        refreshBtn.onmouseover = () => {
            refreshBtn.style.background = '#555555';
        };
        refreshBtn.onmouseout = () => {
            refreshBtn.style.background = currentTheme.buttonBg;
        };
        refreshBtn.onclick = () => {
            loadImages();
            window.showCopyNotification('Imagens atualizadas!');
        };
        imagesSection.appendChild(refreshBtn);

        if (images.length === 0) {
            const noImages = document.createElement('div');
            noImages.textContent = 'Nenhuma imagem encontrada';
            Object.assign(noImages.style, {
                textAlign: 'center',
                color: '#888888'
            });
            imagesSection.appendChild(noImages);
        } else {
            images.forEach((url, index) => {
                const imageItem = document.createElement('div');
                Object.assign(imageItem.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                    borderBottom: index < images.length - 1 ? '1px solid #444444' : 'none'
                });

                const urlText = document.createElement('span');
                urlText.textContent = `Imagem ${index + 1}`;
                Object.assign(urlText.style, {
                    flex: '1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginRight: '8px'
                });

                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copiar URL';
                Object.assign(copyBtn.style, {
                    padding: '4px 8px',
                    background: currentTheme.buttonBg,
                    color: currentTheme.buttonText,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'background 0.3s ease'
                });
                copyBtn.onmouseover = () => {
                    copyBtn.style.background = '#555555';
                };
                copyBtn.onmouseout = () => {
                    copyBtn.style.background = currentTheme.buttonBg;
                };
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(url).then(() => {
                        window.showCopyNotification('URL copiada!');
                    }).catch(() => {
                        window.showCopyNotification('Erro ao copiar URL');
                    });
                };

                imageItem.appendChild(urlText);
                imageItem.appendChild(copyBtn);
                imagesSection.appendChild(imageItem);
            });
        }
    }

    loadImages();

    // Seção de Seleção de Cores
    const themeSection = document.createElement('div');
    themeSection.innerHTML = 'Tema:';
    Object.assign(themeSection.style, {
        fontSize: '14px',
        fontWeight: '500',
        color: currentTheme.menuText,
        marginBottom: '4px'
    });

    const themeSelect = document.createElement('select');
    Object.assign(themeSelect.style, {
        padding: '6px',
        borderRadius: '4px',
        border: '1px solid #444444',
        background: '#2A2F30',
        color: currentTheme.menuText,
        width: '100%',
        fontSize: '14px',
        cursor: 'pointer'
    });

    const themes = [
        { name: 'Preto e Branco', value: { menuBg: '#1C2526', menuText: '#FFFFFF', buttonBg: '#333333', buttonText: '#FFFFFF', panelBg: '#1C2526', panelText: '#FFFFFF' } },
        { name: 'Cinza Escuro', value: { menuBg: '#2A2A2A', menuText: '#D3D3D3', buttonBg: '#444444', buttonText: '#D3D3D3', panelBg: '#2A2A2A', panelText: '#D3D3D3' } },
        { name: 'Azul Escuro', value: { menuBg: '#1A252F', menuText: '#A3BFFA', buttonBg: '#2D3748', buttonText: '#A3BFFA', panelBg: '#1A252F', panelText: '#A3BFFA' } }
    ];

    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = JSON.stringify(theme.value);
        option.textContent = theme.name;
        themeSelect.appendChild(option);
    });

    themeSelect.onchange = () => {
        currentTheme = JSON.parse(themeSelect.value);
        menu.style.background = currentTheme.menuBg;
        menu.style.color = currentTheme.menuText;
        menuTitle.style.color = currentTheme.menuText;
        input.style.color = currentTheme.menuText;
        imagesSection.style.color = currentTheme.menuText;
        analyzeOption.style.background = currentTheme.buttonBg;
        analyzeOption.style.color = currentTheme.buttonText;
        clearOption.style.background = currentTheme.buttonBg;
        clearOption.style.color = currentTheme.buttonText;
        logOption.style.background = currentTheme.buttonBg;
        logOption.style.color = currentTheme.buttonText;
        menuBtn.style.background = currentTheme.buttonBg;
        menuBtn.style.color = currentTheme.buttonText;
        responsePanel.style.background = currentTheme.panelBg;
        responsePanel.style.color = currentTheme.panelText;
        refreshBtn.style.background = currentTheme.buttonBg;
        refreshBtn.style.color = currentTheme.buttonText;
        Array.from(imagesSection.querySelectorAll('button')).forEach(btn => {
            btn.style.background = currentTheme.buttonBg;
            btn.style.color = currentTheme.buttonText;
        });
    };

    const analyzeOption = document.createElement('button');
    analyzeOption.id = 'gemini-analyze-btn';
    analyzeOption.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
    Object.assign(analyzeOption.style, {
        padding: '8px 12px',
        background: currentTheme.buttonBg,
        color: currentTheme.buttonText,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.3s ease',
        fontFamily: 'Arial, sans-serif'
    });
    analyzeOption.onmouseover = () => {
        analyzeOption.style.background = '#555555';
    };
    analyzeOption.onmouseout = () => {
        analyzeOption.style.background = currentTheme.buttonBg;
    };

    const clearOption = document.createElement('button');
    clearOption.innerHTML = '<span style="margin-right: 6px;">🗑️</span>Limpar';
    Object.assign(clearOption.style, {
        padding: '8px 12px',
        background: currentTheme.buttonBg,
        color: currentTheme.buttonText,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.3s ease',
        fontFamily: 'Arial, sans-serif'
    });
    clearOption.onmouseover = () => {
        clearOption.style.background = '#555555';
    };
    clearOption.onmouseout = () => {
        clearOption.style.background = currentTheme.buttonBg;
    };

    const logOption = document.createElement('button');
    logOption.innerHTML = '<span style="margin-right: 6px;">📜</span>Log';
    Object.assign(logOption.style, {
        padding: '8px 12px',
        background: currentTheme.buttonBg,
        color: currentTheme.buttonText,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.3s ease',
        fontFamily: 'Arial, sans-serif'
    });
    logOption.onmouseover = () => {
        logOption.style.background = '#555555';
    };
    logOption.onmouseout = () => {
        logOption.style.background = currentTheme.buttonBg;
    };

    const logPanel = document.createElement('div');
    logPanel.id = 'gemini-log-panel';
    Object.assign(logPanel.style, {
        display: 'none',
        position: 'fixed',
        bottom: '50px',
        right: '300px',
        background: currentTheme.panelBg,
        color: currentTheme.panelText,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        width: '300px',
        maxWidth: '90vw',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
        border: '1px solid #444444'
    });

    logOption.onclick = () => {
        logPanel.style.display = logPanel.style.display === 'block' ? 'none' : 'block';
    };

    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por HCK';
    Object.assign(creditsOption.style, {
        color: '#888888',
        fontSize: '10px',
        textAlign: 'center',
        paddingTop: '8px',
        borderTop: '1px solid #444444',
        fontFamily: 'Arial, sans-serif'
    });

    menu.appendChild(menuTitle);
    menu.appendChild(corsWarning);
    menu.appendChild(input);
    menu.appendChild(imagesSection);
    menu.appendChild(themeSection);
    menu.appendChild(themeSelect);
    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(logOption);
    menu.appendChild(creditsOption);

    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: currentTheme.panelBg,
        color: currentTheme.panelText,
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        maxWidth: '90vw',
        width: '200px',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
        border: '1px solid #444444'
    });
    if (window.innerWidth > 600) {
        responsePanel.style.width = '240px';
    }

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
        height: '2px',
        background: '#666666',
        width: '100%',
        position: 'absolute',
        bottom: '0',
        left: '0',
        borderRadius: '0 0 8px 8px',
        transition: 'width 6s linear'
    });
    responsePanel.appendChild(progressBar);

    const copyNotification = document.createElement('div');
    copyNotification.id = 'gemini-copy-notification';
    Object.assign(copyNotification.style, {
        display: 'none',
        position: 'fixed',
        bottom: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: currentTheme.panelBg,
        color: currentTheme.panelText,
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        zIndex: '10001',
        border: '1px solid #444444'
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, 10px); }
        }
    `;
    document.head.appendChild(style);

    container.appendChild(menuBtn);
    container.appendChild(menu);
    document.body.appendChild(container);
    document.body.appendChild(responsePanel);
    document.body.appendChild(copyNotification);
    document.body.appendChild(logPanel);

    return { menuBtn, analyzeOption, clearOption, input, responsePanel, logPanel };
}

function showResponse(panel, answer, correctAlternative) {
    panel.innerHTML = `
        <div style="text-align: center; font-size: 14px; line-height: 1.4;">
            <strong>${correctAlternative}</strong>${answer ? ` - ${answer}` : ''}
        </div>
    `;
    panel.style.display = 'block';

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 0);
    }

    setTimeout(() => {
        panel.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            panel.style.display = 'none';
            panel.style.animation = 'slideIn 0.3s ease';
        }, 300);
    }, 6000);
}

function showCopyNotification(message) {
    const copyNotification = document.getElementById('gemini-copy-notification');
    if (copyNotification) {
        copyNotification.textContent = message;
        copyNotification.style.display = 'block';

        setTimeout(() => {
            copyNotification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                copyNotification.style.display = 'none';
                copyNotification.style.animation = 'slideIn 0.3s ease';
            }, 300);
        }, 2000);
    }
}

function showLog(logPanel, message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    Object.assign(logEntry.style, {
        padding: '4px 0',
        borderBottom: '1px solid #444444',
        fontSize: '12px',
        wordWrap: 'break-word'
    });
    logPanel.appendChild(logEntry);
    logPanel.scrollTop = logPanel.scrollHeight;
    console.log(`[HCK V3 Log] ${message}`);
}

function clearUI(input, responsePanel, analyzeOption, setIsAnalyzing) {
    if (input) input.value = '';
    if (responsePanel) responsePanel.style.display = 'none';
    if (analyzeOption) {
        analyzeOption.disabled = false;
        analyzeOption.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
        analyzeOption.style.opacity = '1';
    }
    setIsAnalyzing();
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
window.showCopyNotification = showCopyNotification;
window.showLog = showLog;
