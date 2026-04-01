import { useState, useEffect } from 'react';

const theme = {
    bg: '#08090a',
    surface: '#111315',
    surfaceLighter: '#1a1d21',
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.15)',
    accent: '#5e6ad2',
    accentHover: '#717cf0',
    text: '#f7f8f8',
    textSecondary: '#8a8f98',
    error: '#ff4d4d',
    success: '#4dff88',
};

function App() {
    const [loading, setLoading] = useState(false);
    const [simplifiedText, setSimplifiedText] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'simplify' | 'chat' | 'translate'>('simplify');
    const [question, setQuestion] = useState('');
    const [chatAnswer, setChatAnswer] = useState('');
    const [translatedContent, setTranslatedContent] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('Hindi');
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [evaluationScores, setEvaluationScores] = useState<{rouge: number, factuality: number} | null>(null);
    const [evaluating, setEvaluating] = useState(false);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0]?.url;
            if (url) {
                setCurrentUrl(url);
                chrome.storage.local.get([url], (result) => {
                    const data = result[url];
                    if (data) {
                        if (data.simplifiedText) setSimplifiedText(data.simplifiedText);
                        if (data.translatedContent) setTranslatedContent(data.translatedContent);
                        if (data.targetLanguage) setTargetLanguage(data.targetLanguage);
                    }
                });
            }
        });
    }, []);

    useEffect(() => {
        if (!currentUrl) return;
        chrome.storage.local.set({
            [currentUrl]: {
                simplifiedText,
                translatedContent,
                targetLanguage
            }
        });
    }, [simplifiedText, translatedContent, targetLanguage, currentUrl]);

    const handleAction = async () => {
        console.log(`[Simplr] Starting handleAction in ${mode} mode`);
        setLoading(true);
        setError('');
        if (mode === 'simplify') {
            setSimplifiedText('');
            setEvaluationScores(null);
        }
        else if (mode === 'translate') setTranslatedContent('');
        else setChatAnswer('');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) throw new Error("No active tab found");

            const callBackend = async (text: string) => {
                let url = '';
                let body: any = {};
                if (mode === 'simplify') {
                    url = '/simplify/';
                    body = { text };
                } else if (mode === 'chat') {
                    url = '/chat/';
                    body = { question, context_text: text };
                } else if (mode === 'translate') {
                    let sourceText = simplifiedText;
                    if (!sourceText) {
                        const simResp = await fetch(`http://localhost:8000/api/v1/simplify/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text }),
                        });
                        if (!simResp.ok) {
                            const errData = await simResp.json().catch(() => ({}));
                            throw new Error(errData.detail || "Failed to generate summary for translation");
                        }
                        const simData = await simResp.json();
                        sourceText = simData.simplified_text;
                        setSimplifiedText(sourceText);
                    }
                    url = '/translation/';
                    body = { text: sourceText, target_language: targetLanguage };
                }

                const apiResponse = await fetch(`http://localhost:8000/api/v1${url}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!apiResponse.ok) {
                    const errorData = await apiResponse.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Failed to ${mode}`);
                }

                const data = await apiResponse.json();
                if (mode === 'simplify') {
                    setSimplifiedText(data.simplified_text);
                    
                    // Asynchronously fetch evaluation scores without blocking user UI
                    setEvaluating(true);
                    setEvaluationScores(null);
                    fetch(`http://localhost:8000/api/v1/evaluate/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ original_text: text, generated_summary: data.simplified_text }),
                    })
                    .then(res => res.json())
                    .then(evalData => {
                        if (evalData.rouge_l_score_percent !== undefined) {
                            setEvaluationScores({
                                rouge: evalData.rouge_l_score_percent,
                                factuality: evalData.factuality_score_percent
                            });
                        }
                    })
                    .catch(err => console.error("Evaluation failed", err))
                    .finally(() => setEvaluating(false));
                }
                else if (mode === 'chat') setChatAnswer(data.answer);
                else if (mode === 'translate') setTranslatedContent(data.translated_text);
            };

            chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_TEXT" }, async (response) => {
                if (chrome.runtime.lastError || !(response && response.text)) {
                    try {
                        const results = await chrome.scripting.executeScript({
                            target: { tabId: tab.id! },
                            func: () => document.body.innerText,
                        });
                        const text = results[0]?.result;
                        if (text) {
                            try { await callBackend(text); } catch (e: any) { setError(e.message); }
                            finally { setLoading(false); }
                        } else throw new Error("No text content found");
                    } catch (err: any) {
                        setError("Could not read page content. Try refreshing.");
                        setLoading(false);
                    }
                } else {
                    try { await callBackend(response.text); } catch (e: any) { setError(e.message); }
                    finally { setLoading(false); }
                }
            });
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const FormattedText = ({ text }: { text: string }) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <div style={{ color: theme.textSecondary, lineHeight: '1.6', fontSize: '14px' }}>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} style={{ color: theme.text }}>{part.slice(2, -2)}</strong>;
                    }
                    const italicParts = part.split(/(\*.*?\*)/g);
                    return italicParts.map((iPart, j) => {
                        if (iPart.startsWith('*') && iPart.endsWith('*')) {
                            return <em key={`${i}-${j}`} style={{ color: theme.text }}>{iPart.slice(1, -1)}</em>;
                        }
                        return iPart;
                    });
                })}
            </div>
        );
    };

    return (
        <div style={{
            width: '380px',
            background: theme.bg,
            color: theme.text,
            padding: '24px',
            fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,100..900;1,100..900&display=swap');
                
                * { font-family: 'Saira', sans-serif !important; }
                ::selection { background: ${theme.accent}; color: white; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: ${theme.textSecondary}; }
                button { transition: all 0.2s ease; }
                textarea { transition: border-color 0.2s ease; }
            `}</style>

            <header style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                    width: '24px', height: '24px', background: 'linear-gradient(135deg, #5e6ad2, #8a94e9)',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '12px', color: 'white',
                    boxShadow: '0 2px 8px rgba(94, 106, 210, 0.4)'
                }}>S</div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.5px' }}>Simplr</h2>
            </header>

            <nav style={{
                display: 'flex',
                background: theme.surface,
                padding: '4px',
                borderRadius: '8px',
                marginBottom: '24px',
                border: `1px solid ${theme.border}`
            }}>
                {(['simplify', 'chat', 'translate'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        style={{
                            flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                            background: mode === m ? theme.surfaceLighter : 'transparent',
                            color: mode === m ? theme.text : theme.textSecondary,
                            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                            boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </nav>

            <main>
                {mode === 'simplify' ? (
                    simplifiedText ? (
                        <div style={{
                            background: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '10px',
                            padding: '16px',
                            maxHeight: '350px',
                            overflowY: 'auto',
                            position: 'relative'
                        }}>
                            <FormattedText text={simplifiedText} />
                            
                            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
                                {evaluating ? (
                                    <span style={{ color: theme.textSecondary }}>Running AI Evaluation...</span>
                                ) : evaluationScores ? (
                                    <>
                                        <div style={{ background: 'rgba(77, 255, 136, 0.1)', color: theme.success, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.success}30` }}>
                                            Factuality: {evaluationScores.factuality}%
                                        </div>
                                        <div style={{ background: 'rgba(94, 106, 210, 0.1)', color: theme.accent, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.accent}30` }}>
                                            Accuracy (ROUGE): {evaluationScores.rouge}%
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            <button
                                onClick={() => { setSimplifiedText(''); setEvaluationScores(null); }}
                                style={{
                                    marginTop: '16px', padding: '8px 12px', borderRadius: '6px',
                                    background: theme.surfaceLighter, color: theme.text,
                                    border: `1px solid ${theme.border}`, cursor: 'pointer', fontSize: '12px'
                                }}
                            >
                                ← Clear
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <p style={{ color: theme.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
                                Distill the current page into clear, concise text.
                            </p>
                            <button
                                onClick={handleAction}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    background: `linear-gradient(to bottom, ${theme.accentHover}, ${theme.accent})`,
                                    color: 'white', border: 'none',
                                    fontSize: '14px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    boxShadow: `0 4px 16px ${theme.accent}30`,
                                    borderTop: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                {loading ? 'Simplifying...' : 'Simplify Content'}
                            </button>
                        </div>
                    )
                ) : mode === 'translate' ? (
                    translatedContent ? (
                        <div style={{
                            background: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '10px',
                            padding: '16px',
                            maxHeight: '350px',
                            overflowY: 'auto',
                            position: 'relative'
                        }}>
                            <FormattedText text={translatedContent} />
                            <button
                                onClick={() => setTranslatedContent('')}
                                style={{
                                    marginTop: '16px', padding: '8px 12px', borderRadius: '6px',
                                    background: theme.surfaceLighter, color: theme.text,
                                    border: `1px solid ${theme.border}`, cursor: 'pointer', fontSize: '12px'
                                }}
                            >
                                ← Clear
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ color: theme.textSecondary, fontSize: '14px', marginBottom: '8px', textAlign: 'center' }}>
                                Generate and translate the summary to an Indian language.
                            </p>
                            <select
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                style={{
                                    padding: '10px', borderRadius: '8px', background: theme.surface,
                                    color: theme.text, border: `1px solid ${theme.border}`,
                                    outline: 'none', fontSize: '14px', cursor: 'pointer'
                                }}
                            >
                                {['Hindi', 'Tamil', 'Marathi', 'Telugu', 'Malayalam', 'Kannada'].map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAction}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    background: `linear-gradient(to bottom, ${theme.accentHover}, ${theme.accent})`,
                                    color: 'white', border: 'none',
                                    fontSize: '14px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    boxShadow: `0 4px 16px ${theme.accent}30`,
                                    borderTop: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                {loading ? 'Translating...' : 'Translate Summary'}
                            </button>
                        </div>
                    )
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask anything about this document..."
                            style={{
                                width: '100%', height: '100px', padding: '12px', borderRadius: '8px',
                                background: theme.surface, color: theme.text,
                                border: `1px solid ${theme.border}`, outline: 'none',
                                fontSize: '14px', resize: 'none', boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = theme.accent}
                            onBlur={(e) => e.target.style.borderColor = theme.border}
                        />
                        <button
                            onClick={handleAction}
                            disabled={loading || !question}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: `linear-gradient(to bottom, ${theme.accentHover}, ${theme.accent})`,
                                color: 'white', border: 'none',
                                fontSize: '14px', fontWeight: 600, cursor: (loading || !question) ? 'not-allowed' : 'pointer',
                                opacity: (loading || !question) ? 0.6 : 1,
                                borderTop: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            {loading ? 'Thinking...' : 'Send Question'}
                        </button>

                        {chatAnswer && (
                            <div style={{
                                background: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: '10px',
                                padding: '16px',
                                maxHeight: '250px',
                                overflowY: 'auto'
                            }}>
                                <FormattedText text={chatAnswer} />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {error && (
                <div style={{
                    marginTop: '16px', padding: '10px', borderRadius: '6px',
                    background: `${theme.error}15`, color: theme.error,
                    border: `1px solid ${theme.error}30`, fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <span>⚠️</span> {error}
                </div>
            )}

            <footer style={{ marginTop: '24px', textAlign: 'center' }}>
                <span style={{ color: theme.textSecondary, fontSize: '11px', opacity: 0.5 }}>
                    Powered by Simplr AI Engine
                </span>
            </footer>
        </div>
    );
}

export default App;
