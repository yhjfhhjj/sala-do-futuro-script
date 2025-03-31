function createUI() {
    if (window.location.hostname !== 'saladofuturo.educacao.sp.gov.br') return;

    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

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
    menuBtn.innerHTML = 'Ajuda';
    Object.assign(menuBtn.style, {
        padding: '8px 12px',
        background: '#0056D2',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'background 0.3s ease',
        alignSelf: 'flex-end'
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.background = '#003BB5';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.background = '#0056D2';
    };

    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: '#FFFFFF',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
        position: 'fixed',
        bottom: '50px',
        right: '10px',
        flexDirection: 'column',
        gap: '8px',
        width: '250px',
        maxWidth: '90vw',
        border: '1px solid #E0E0E0'
    });

    if (window.innerWidth > 600) {
        menu.style.width = '300px';
    }

    const menuTitle = document.createElement('div');
    menuTitle.innerHTML = 'Assistente de Questões';
    Object.assign(menuTitle.style, {
        color: '#333',
        fontSize: '16px',
        fontWeight: '600',
        textAlign: 'center',
        paddingBottom: '6px',
        borderBottom: '1px solid #E0E0E0'
    });

    const corsWarning = document.createElement('div');
    corsWarning.innerHTML = '⚠️ Instale a extensão "CORS Unblock" no Chrome para usar este assistente.';
    Object.assign(corsWarning.style, {
        color: '#D32F2F',
        fontSize: '12px',
        textAlign: 'center',
        padding: '6px',
        background: '#FFEBEE',
        borderRadius: '4px',
        marginBottom: '8px'
    });

    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole a questão aqui...';
    Object.assign(input.style, {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #E0E0E0',
        background: '#F5F5F5',
        fontSize: '14px',
        color: '#333',
        outline: 'none',
        resize: 'vertical',
        minHeight: '50px',
        maxHeight: '80px',
        width: '100%',
        transition: 'border-color 0.3s ease',
        fontFamily: 'Arial, sans-serif'
    });
    if (window.innerWidth > 600) {
        input.style.maxHeight = '100px';
    }
    input.onfocus = () => {
        input.style.borderColor = '#0056D2';
    };
    input.onblur = () => {
        input.style.borderColor = '#E0E0E0';
    };

    const imagesSection = document.createElement('div');
    imagesSection.id = 'gemini-images-section';
    Object.assign(imagesSection.style, {
        maxHeight: '120px',
        overflowY: 'auto',
        padding: '6px',
        background: '#F5F5F5',
        borderRadius: '4px',
        border: '1px solid #E0E0E0',
        fontSize: '12px',
        color: '#333',
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
                    /\.(jpg|png|jpeg|gif|webp)$/i
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
            background: '#0056D2',
            color: '#FFFFFF',
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
            refreshBtn.style.background = '#003BB5';
        };
        refreshBtn.onmouseout = () => {
            refreshBtn.style.background = '#0056D2';
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
                color: '#666'
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
                    borderBottom: index < images.length - 1 ? '1px solid #E0E0E0' : 'none'
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
                    background: '#0056D2',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'background 0.3s ease'
                });
                copyBtn.onmouseover = () => {
                    copyBtn.style.background = '#003BB5';
                };
                copyBtn.onmouseout = () => {
                    copyBtn.style.background = '#0056D2';
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

    const analyzeOption = document.createElement('button');
    analyzeOption.id = 'gemini-analyze-btn';
    analyzeOption.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
    Object.assign(analyzeOption.style, {
        padding: '8px 12px',
        background: '#0056D2',
        color: '#FFFFFF',
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
        analyzeOption.style.background = '#003BB5';
    };
    analyzeOption.onmouseout = () => {
        analyzeOption.style.background = '#0056D2';
    };

    const clearOption = document.createElement('button');
    clearOption.innerHTML = '<span style="margin-right: 6px;">🗑️</span>Limpar';
    Object.assign(clearOption.style, {
        padding: '8px 12px',
        background: '#D32F2F',
        color: '#FFFFFF',
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
        clearOption.style.background = '#B71C1C';
    };
    clearOption.onmouseout = () => {
        clearOption.style.background = '#D32F2F';
    };

    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por Sala do Futuro';
    Object.assign(creditsOption.style, {
        color: '#666',
        fontSize: '10px',
        textAlign: 'center',
        paddingTop: '6px',
        borderTop: '1px solid #E0E0E0',
        fontFamily: 'Arial, sans-serif'
    });

    menu.appendChild(menuTitle);
    menu.appendChild(corsWarning);
    menu.appendChild(input);
    menu.appendChild(imagesSection);
    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(creditsOption);

    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#FFFFFF',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        maxWidth: '90vw',
        width: '200px',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
        border: '1px solid #E0E0E0'
    });
    if (window.innerWidth > 600) {
        responsePanel.style.width = '240px';
    }

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
        height: '2px',
        background: '#0056D2',
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
        background: '#FFFFFF',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        color: '#333',
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        zIndex: '10001',
        border: '1px solid #E0E0E0'
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

    return { menuBtn, analyzeOption, clearOption, input, responsePanel };
}

function showResponse(panel, answer, correctAlternative) {
    panel.innerHTML = `
        <div style="color: #333; text-align: center; font-size: 14px; line-height: 1.4;">
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
