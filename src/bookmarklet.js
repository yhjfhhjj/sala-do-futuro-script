(function() {
    const _0x5a1c = [
        'c2FsYWRvZnV0dXJvLmVkdWNhY2FvLnNwLmdvdi5icg==', // 0
        'QUl6YVN5QmhsaThtR0ExLTEtMVpyRllEMUZaek1Ga0hoRHJkWUNYd1k=', // 1
        'aHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy9nZW1pbmktMi4wLWZsYXNoOmdlbmVyYXRlQ29udGVudA==', // 2
        'aHR0cHM6Ly9yZXMuY2xvdWRpbmFyeS5jb20vZGN0eGNlenNkL3Jhdy91cGxvYWQvdjE3NDMyODgwOTcvdWkuanM=', // 3
        'text', // 4
        'body', // 5
        'script', // 6
        'style', // 7
        'noscript', // 8
        'svg', // 9
        'iframe', // 10
        'head', // 11
        'img', // 12
        'http', // 13
        'edusp-static.ip.tv/sala-do-futuro', // 14
        'textContent', // 15
        'replace', // 16
        'substring', // 17
        'trim', // 18
        'UG9yIGZhdm9yLCBjb2xlIHVtYSBwZXJndW50YSBjb20gYWx0ZXJuYXRpdmFzLg==', // 19
        'match', // 20
        '\\[Imagem: (https:\\/\\/[^\\]]+)\\]', // 21
        '\\[Imagem: https:\\/\\/[^\\]]+\\]', // 22
        'UmVzcG9uZGEgwCBzZWd1aW50ZSBwZXJndW50YSBjb20gYmFzZSBubyBjb250ZcO6ZG8gZGEgcMOhZ2luYSBlIGluZGlxdWUgYXBlbmFzIGEgYWx0ZXJuYXRpdmEgY29ycmV0YSAoZXguOiAiQSIpLiBTZSBob3V2ZXIgdW1hIGltYWdlbSwgdXNlLWEgY29tbyBjb250ZXh0byBhZGljaW9uYWwuXG5cblBlcmd1bnRhOlxu', // 23
        'Q29udGXDumRvOlxuVGV4dG86IA==', // 24
        'SW1hZ2Vuczo=', // 25
        'SW1hZ2VtIGFkaWNpb25hbDo=', // 26
        'UmVzcG9zdGE6', // 27
        'POST', // 28
        'Content-Type', // 29
        'application/json', // 30
        'stringify', // 31
        'json', // 32
        'candidates', // 33
        'content', // 34
        'parts', // 35
        'RXJybw==', // 36
        'Erro na API:', // 37
        'click', // 38
        'gemini-menu', // 39
        'flex', // 40
        'none', // 41
        'value', // 42
        'disabled', // 43
        'innerHTML', // 44
        '4pqg', // 45: ⏳
        'QW5hbGlzYW5kby4uLg==', // 46: Analisando...
        'opacity', // 47
        '8J+mig==', // 48: 🔍
        'QW5hbGlzYXI=', // 49: Analisar
        'closest', // 50
        '#gemini-helper-container', // 51
        '#gemini-response-panel', // 52
        'Erro ao carregar ui.js: ', // 53
        'error', // 54
        'log' // 55 - Not used, but could be for console.log if needed
    ];

    const _0x3d7a = function(i) {
        return atob(_0x5a1c[i]); 
    };

    const _0x1e8a = window;
    const _0x4b2f = document;
    const _0x5c0d = console;
    const _0x2a91 = fetch;

    if (_0x1e8a.location.hostname !== _0x3d7a(0x0)) return;

    const _0x11f7 = _0x3d7a(0x1);
    const _0x5d8b = _0x3d7a(0x2);
    const _0x3b4e = _0x3d7a(0x3);

    _0x2a91(_0x3b4e)
        .then(r => r[_0x3d7a(0x4)]())
        .then(s => {
            (function(scriptContent) { 
                eval(scriptContent);

                let _0x3a0f = 0x0; // isAnalyzing (0 = false, 1 = true)

                const _0x2c7b = v => { _0x3a0f = v ? 0x1 : 0x0; };

                const _0x1f9c = () => {
                    const _0x5e1a = _0x4b2f.querySelector(_0x3d7a(0x5)) || _0x4b2f.documentElement;
                    const _0x4a2d = [_0x3d7a(0x6), _0x3d7a(0x7), _0x3d7a(0x8), _0x3d7a(0x9), _0x3d7a(0xa), _0x3d7a(0xb)];
                    _0x4a2d.forEach(t => _0x5e1a.querySelectorAll(t).forEach(e => e.remove()));
                    const _0x15b3 = Array.from(_0x4b2f.querySelectorAll(_0x3d7a(0xc)))
                        .map(m => m.src)
                        .filter(sr => sr && sr.startsWith(_0x3d7a(0xd)) && !sr.includes(_0x3d7a(0xe)))
                        .slice(0x0, 0x32); // 50
                    const _0x2d4f = (_0x5e1a[_0x3d7a(0xf)] || '')[_0x3d7a(0x10)](/\s+/g, ' ')[_0x3d7a(0x11)](0x0, 0x3a98); // 15000
                    return { text: _0x2d4f, images: _0x15b3 };
                };

                const _0x4f8a = async (c, q) => {
                    const _0x5b1d = q[_0x3d7a(0x12)]();
                    if (!_0x5b1d) return { answer: '', correctAlternative: _0x3d7a(0x13) };

                    const _0x1a9e = _0x5b1d[_0x3d7a(0x14)](new RegExp(_0x3d7a(0x15)));
                    const _0x3e5f = _0x1a9e ? _0x1a9e[0x1] : null;
                    const _0x21e0 = _0x5b1d[_0x3d7a(0x10)](new RegExp(_0x3d7a(0x16)), '')[_0x3d7a(0x12)]();

                    const _0x50a2 = `${_0x3d7a(0x17)}${_0x21e0}\n\n${_0x3d7a(0x18)}${c.text}\n${_0x3d7a(0x19)} ${c.images.join(', ')}${_0x3e5f ? `\n${_0x3d7a(0x1a)} ${_0x3e5f}` : ''}\n\n${_0x3d7a(0x1b)}`;

                    try {
                        const _0x39c1 = await _0x2a91(`${_0x5d8b}?key=${_0x11f7}`, {
                            method: _0x3d7a(0x1c),
                            headers: { [_0x3d7a(0x1d)]: _0x3d7a(0x1e) },
                            body: JSON[_0x3d7a(0x1f)]({
                                contents: [{ [_0x3d7a(0x23)]: [{ text: _0x50a2 }] }],
                                generationConfig: { maxOutputTokens: 0xa, temperature: 0.3 } // 10
                            })
                        });
                        const _0x4c5d = await _0x39c1[_0x3d7a(0x20)]();
                        const _0x17e2 = _0x4c5d?.[_0x3d7a(0x21)]?.[0x0]?.[_0x3d7a(0x22)]?.[_0x3d7a(0x23)]?.[0x0]?.text?.[_0x3d7a(0x12)]() || _0x3d7a(0x24);
                        const _0x53e8 = _0x17e2[_0x3d7a(0x14)](/[A-E]/i);
                        const _0x41d0 = _0x53e8 ? _0x53e8[0x0] : _0x3d7a(0x24);
                        const _0x1d6b = _0x17e2.length > 0x1 ? _0x17e2[_0x3d7a(0x10)](/[A-E]/i, '')[_0x3d7a(0x12)]() : '';
                        return { answer: _0x1d6b, correctAlternative: _0x41d0 };
                    } catch (_0x3f2a) {
                        _0x5c0d[_0x3d7a(0x26)](_0x3d7a(0x25), _0x3f2a);
                        return { answer: '', correctAlternative: _0x3d7a(0x24) };
                    } finally {
                        _0x2c7b(0x0);
                    }
                };

                const { menuBtn: _0x1b8a, analyzeOption: _0x30c1, clearOption: _0x4e3b, input: _0x59a2, responsePanel: _0x2f5e } = _0x1e8a.createUI();
                if (!_0x1b8a) return;

                _0x1b8a.addEventListener(_0x3d7a(0x26), () => {
                    const m = _0x4b2f.getElementById(_0x3d7a(0x27));
                    m.style.display = m.style.display === _0x3d7a(0x28) ? _0x3d7a(0x29) : _0x3d7a(0x28);
                });

                _0x30c1.addEventListener(_0x3d7a(0x26), async () => {
                    if (_0x3a0f) return;
                    const q = _0x59a2[_0x3d7a(0x2a)][_0x3d7a(0x12)]();
                    if (!q) {
                        _0x1e8a.showResponse(_0x2f5e, '', _0x3d7a(0x13));
                        return;
                    }
                    _0x2c7b(0x1);
                    _0x30c1[_0x3d7a(0x2b)] = !!_0x3a0f; // Convert 0/1 back to boolean
                    _0x30c1[_0x3d7a(0x2c)] = `<span style="margin-right: 8px;">${_0x3d7a(0x2d)}</span>${_0x3d7a(0x2e)}`;
                    _0x30c1.style[_0x3d7a(0x2f)] = '0.7';
                    const c = _0x1f9c();
                    const { answer: _0x10a3, correctAlternative: _0x50f9 } = await _0x4f8a(c, q);
                    _0x1e8a.showResponse(_0x2f5e, _0x10a3, _0x50f9);
                    _0x30c1[_0x3d7a(0x2b)] = !!_0x3a0f; // Convert 0/1 back to boolean
                    _0x30c1[_0x3d7a(0x2c)] = `<span style="margin-right: 8px;">${_0x3d7a(0x30)}</span>${_0x3d7a(0x31)}`;
                    _0x30c1.style[_0x3d7a(0x2f)] = '1';
                    _0x4b2f.getElementById(_0x3d7a(0x27)).style.display = _0x3d7a(0x29);
                });

                _0x4e3b.addEventListener(_0x3d7a(0x26), () => {
                    _0x1e8a.clearUI(_0x59a2, _0x2f5e, _0x30c1, _0x2c7b);
                    _0x4b2f.getElementById(_0x3d7a(0x27)).style.display = _0x3d7a(0x29);
                });

                _0x4b2f.addEventListener(_0x3d7a(0x26), e => {
                    if (!e.target[_0x3d7a(0x32)](_0x3d7a(0x33)) && !e.target[_0x3d7a(0x32)](_0x3d7a(0x34))) {
                        _0x4b2f.getElementById(_0x3d7a(0x27)).style.display = _0x3d7a(0x29);
                    }
                });

            })(s);
        })
        .catch(err => _0x5c0d[_0x3d7a(0x26)](_0x3d7a(0x35), err)); // Use console.error
})();
