function createUI() {
    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

    // Carregar a fonte Poppins via Google Fonts
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Container principal (fixo no canto inferior direito)
    const container = document.createElement('div');
    container.id = 'gemini-helper-container';
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: '"Poppins", sans-serif',
    });

    // Botão de menu (iniciais "HCK")
    const menuBtn = document.createElement('button');
    menuBtn.id = 'gemini-menu-btn';
    menuBtn.innerHTML = 'HCK';
    Object.assign(menuBtn.style, {
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #FF6F61, #D946EF)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(217, 70, 239, 0.3)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        alignSelf: 'flex-end',
        animation: 'pulse 2.5s infinite ease-in-out'
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.transform = 'scale(1.1)';
        menuBtn.style.boxShadow = '0 6px 16px rgba(217, 70, 239, 0.5)';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.transform = 'scale(1)';
        menuBtn.style.boxShadow = '0 4px 12px rgba(217, 70, 239, 0.3)';
    };

    // Menu lateral
    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: 'rgba(28, 37, 38, 0.95)',
        borderRadius: '20px',
        padding: '12px',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4), 0 0 8px rgba(217, 70, 239, 0.2)',
        position: 'fixed',
        bottom: '70px',
        right: '20px',
        flexDirection: 'column',
        gap: '10px',
        animation: 'menuFadeScale 0.4s ease-out',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        width: '200px',
        maxWidth: '80vw',
        border: '1px solid rgba(217, 70, 239, 0.2)'
    });

    // Ajustes para PC
    if (window.innerWidth > 600) {
        Object.assign(menu.style, {
            width: '300px',
            padding: '16px',
        });
    }

    // Título "HCK"
    const menuTitle = document.createElement('div');
    menuTitle.innerHTML = 'HCK';
    Object.assign(menuTitle.style, {
        color: '#D946EF',
        fontSize: '24px',
        fontWeight: '700',
        textAlign: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        letterSpacing: '1.2px'
    });

    // Input (textarea) dentro do menu
    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole sua pergunta aqui...';
    Object.assign(input.style, {
        padding: '10px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(42, 52, 53, 0.8)',
        fontSize: '14px',
        fontWeight: '400',
        color: '#E0E0E0',
        outline: 'none',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        resize: 'vertical',
        minHeight: '60px',
        maxHeight: '80px',
        width: '100%',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        fontFamily: '"Poppins", sans-serif'
    });
    if (window.innerWidth > 600) {
        input.style.maxHeight = '100px';
    }
    input.onfocus = () => {
        input.style.borderColor = '#D946EF';
        input.style.boxShadow = '0 0 8px rgba(217, 70, 239, 0.4)';
    };
    input.onblur = () => {
        input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        input.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3)';
    };

    // Seção de imagens
    const imagesSection = document.createElement('div');
    imagesSection.id = 'gemini-images-section';
    Object.assign(imagesSection.style, {
        maxHeight: '100px',
        overflowY: 'auto',
        padding: '8px',
        background: 'rgba(42, 52, 53, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '12px',
        color: '#E0E0E0',
        fontFamily: '"Poppins", sans-serif'
    });

    // Extrair URLs de imagens da página
    const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src && src.startsWith('http'))
        .slice(0, 5); // Limite de 5 imagens

    if (images.length === 0) {
        imagesSection.innerHTML = '<div style="text-align: center; color: #999;">Nenhuma imagem encontrada</div>';
    } else {
        images.forEach((url, index) => {
            const imageItem = document.createElement('div');
            Object.assign(imageItem.style, {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                borderBottom: index < images.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
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
                background: 'linear-gradient(135deg, #FF6F61, #D946EF)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            });
            copyBtn.onmouseover = () => {
                copyBtn.style.transform = 'translateY(-1px)';
                copyBtn.style.boxShadow = '0 2px 8px rgba(217, 70, 239, 0.5)';
            };
            copyBtn.onmouseout = () => {
                copyBtn.style.transform = 'translateY(0)';
                copyBtn.style.boxShadow = 'none';
            };
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(url).then(() => {
                    showCopyNotification('URL copiada!');
                });
            };

            imageItem.appendChild(urlText);
            imageItem.appendChild(copyBtn);
            imagesSection.appendChild(imageItem);
        });
    }

    // Botão "Analisar"
    const analyzeOption = document.createElement('button');
    analyzeOption.id = 'gemini-analyze-btn';
    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
    Object.assign(analyzeOption.style, {
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #FF6F61, #D946EF)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        fontFamily: '"Poppins", sans-serif'
    });
    analyzeOption.onmouseover = () => {
        analyzeOption.style.transform = 'translateY(-2px)';
        analyzeOption.style.boxShadow = '0 4px 12px rgba(217, 70, 239, 0.5)';
    };
    analyzeOption.onmouseout = () => {
        analyzeOption.style.transform = 'translateY(0)';
        analyzeOption.style.boxShadow = 'none';
    };

    // Botão "Limpar"
    const clearOption = document.createElement('button');
    clearOption.innerHTML = '<span style="margin-right: 8px;">🗑️</span>Limpar';
    Object.assign(clearOption.style, {
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #FF6F61, #D946EF)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        fontFamily: '"Poppins", sans-serif'
    });
    clearOption.onmouseover = () => {
        clearOption.style.transform = 'translateY(-2px)';
        clearOption.style.boxShadow = '0 4px 12px rgba(217, 70, 239, 0.5)';
    };
    clearOption.onmouseout = () => {
        clearOption.style.transform = 'translateY(0)';
        clearOption.style.boxShadow = 'none';
    };

    // Créditos
    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por Hackermoon';
    Object.assign(creditsOption.style, {
        color: '#D946EF',
        fontSize: '10px',
        fontWeight: '400',
        textAlign: 'center',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: '"Poppins", sans-serif',
        opacity: '0.7'
    });

    menu.appendChild(menuTitle);
    menu.appendChild(input);
    menu.appendChild(imagesSection); // Nova seção de imagens
    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(creditsOption);

    // Painel de resposta (toast minimalista)
    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(28, 37, 38, 0.95)',
        borderRadius: '12px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '90vw',
        width: '220px',
        zIndex: '1000000',
        animation: 'slideIn 0.3s ease',
        fontFamily: '"Poppins", sans-serif',
        border: '1px solid rgba(217, 70, 239, 0.2)'
    });
    if (window.innerWidth > 600) {
        responsePanel.style.width = '260px';
    }

    // Barra de progresso
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
        height: '2px',
        background: 'linear-gradient(135deg, #FF6F61, #D946EF)',
        width: '100%',
        position: 'absolute',
        bottom: '0',
        left: '0',
        borderRadius: '0 0 12px 12px',
        transition: 'width 6s linear'
    });
    responsePanel.appendChild(progressBar);

    // Notificação de cópia
    const copyNotification = document.createElement('div');
    copyNotification.id = 'gemini-copy-notification';
    Object.assign(copyNotification.style, {
        display: 'none',
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(28, 37, 38, 0.95)',
        borderRadius: '12px',
        padding: '8px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        color: '#E0E0E0',
        fontSize: '12px',
        fontFamily: '"Poppins", sans-serif',
        zIndex: '1000001',
        animation: 'slideIn 0.3s ease'
    });

    // Estilo de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, 20px); }
        }
        @keyframes menuFadeScale {
            from { opacity: 0; transform: translateY(15px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3); }
            50% { transform: scale(1.05); box-shadow: 0 6px 16px rgba(217, 70, 239, 0.5); }
            100% { transform: scale(1); box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3); }
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
        <div style="color: #FFFFFF; text-align: center; font-size: 14px; line-height: 1.4;">
            <strong>${correctAlternative}</strong> - ${answer}
        </div>
    `;
    panel.style.display = 'block';

    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '100%';
    setTimeout(() => {
        progressBar.style.width = '0%';
    }, 0);

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

function clearUI(input, responsePanel, analyzeOption, setIsAnalyzing) {
    input.value = '';
    responsePanel.style.display = 'none';
    analyzeOption.disabled = false;
    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
    analyzeOption.style.opacity = '1';
    setIsAnalyzing(false);
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
window.showCopyNotification = showCopyNotification;
