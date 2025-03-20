# perplexityAI-chatroom-v1


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// 環境変数からAPIキーを取得するための関数（React Native用を想定）
const getEnvVariable = (name: string): string | undefined => {
    // React Nativeではprocess.envは使えないので、グローバル変数などで代替
    if (typeof process !== 'undefined' && process.env) {
        return process.env[name];
    }
    // ブラウザ環境の場合は、windowオブジェクトなどを利用する
    if (typeof window !== 'undefined') {
        // @ts-ignore
        return window.env ? window.env[name] : undefined;
    }
    return undefined;
};

// メッセージの型定義
interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// チャットアプリのメインコンポーネント
const PerplexityChatApp = () => {
    // 状態変数
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [apiKey, setApiKey] = useState<string | undefined>(() => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('perplexityApiKey') || undefined;
        }
        return undefined;
      });
    const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(!apiKey);
    const [tempApiKey, setTempApiKey] = useState('');

    // スクロール処理
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // 初回ロード時のメッセージ
      useEffect(() => {
        if (!apiKey) {
            setMessages([
                {
                    role: 'system',
                    content:
                        "Perplexity AI チャットへようこそ！\n" +
                        "まずは、Perplexity AIのAPIキーを入力してください。",
                },
            ]);
        } else {
             setMessages([
                {
                    role: 'system',
                    content:
                        "チャットを開始します。\n" +
                        "質問を入力して送信してください。",
                },
            ]);
        }
    }, [apiKey]);

    // inputのリサイズ
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [input]);

    // APIキー設定処理
    const handleApiKeySubmit = () => {
        if (tempApiKey.trim()) {
            setApiKey(tempApiKey);
            localStorage.setItem('perplexityApiKey', tempApiKey);
            setShowApiKeyInput(false);
            setMessages([
                {
                    role: 'system',
                    content: "APIキーが設定されました。チャットを開始できます。",
                },
            ]);
        } else {
            setError('APIキーを入力してください。');
        }
    };

    // メッセージ送信処理
    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // APIキーがない場合はエラー
            if (!apiKey) {
                throw new Error("APIキーが設定されていません。");
            }

            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.1-sonar-large-128k-online', // モデルを指定
                    messages: [
                        { role: 'system', content: 'あなたは有能なアシスタントです。' },
                        ...newMessages, // 過去のメッセージと今回のユーザーメッセージを含む
                    ],
                    stream: false, // ストリーミングしない
                    max_tokens: 1024,
                    frequency_penalty: 1,
                    temperature: 0.0,
                }),
            });

            if (!response.ok) {
                let errorMessage = `APIリクエストエラー: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage += ` - ${errorData.error?.message || JSON.stringify(errorData)}`;
                } catch (parseError) {
                    errorMessage += ' - レスポンス解析エラー';
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const assistantResponse: Message = { role: 'assistant', content: data.choices[0].message.content.trim() };
            setMessages([...newMessages, assistantResponse]);
        } catch (err: any) {
            setError(err.message || '不明なエラーが発生しました。');
            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: "エラーが発生しました。もう一度お試しください。" }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, messages, isLoading, apiKey]);

    // Enterキーで送信、Shift+Enterで改行
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
            {/* APIキー入力画面 */}
            <AnimatePresence>
                {showApiKeyInput && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                                Perplexity AI APIキーを入力してください
                            </h2>
                            <Input
                                type="password"
                                placeholder="APIキー"
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                className="mb-4"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleApiKeySubmit();
                                    }
                                }}
                            />
                            <Button onClick={handleApiKeySubmit} className="w-full">
                                設定
                            </Button>
                            {error && (
                                <p className="text-red-500 mt-2 text-sm">{error}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* チャット画面 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={chatContainerRef}>
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                'mb-4 p-4 rounded-lg max-w-[85%] md:max-w-[70%] shadow-md',
                                message.role === 'user'
                                    ? 'bg-blue-100 dark:bg-blue-800 self-end text-right'
                                    : 'bg-gray-200 dark:bg-gray-700 self-start',
                                'whitespace-pre-wrap break-words' // 改行と長い単語の処理
                            )}
                        >
                            {message.role === 'system' ? (
                                <div className="text-gray-600 dark:text-gray-400 font-italic">
                                    <MessageSquare className="inline-block mr-2 w-4 h-4" />
                                    {message.content}
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        'text-gray-900 dark:text-white',
                                        message.role === 'user' && 'font-semibold'
                                    )}
                                >
                                    {message.role === 'user' ? 'あなた: ' : 'AI: '}
                                    {message.content}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-4 p-4 rounded-lg bg-gray-200 dark:bg-gray-700 self-start max-w-[85%] md:max-w-[70%] shadow-md"
                    >
                        <Loader2 className="animate-spin mr-2 w-4 h-4 text-gray-600 dark:text-gray-400 inline-block" />
                        考え中...
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 self-center w-full max-w-md border border-red-300 dark:border-red-700"
                    >
                        <AlertTriangle className="inline-block mr-2 w-5 h-5" />
                        {error}
                    </motion.div>
                )}
            </div>

            {/* 入力欄 */}
            <div className="p-4 md:p-6 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-2 md:gap-4">
                    <Textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="メッセージを入力..."
                        className="flex-1 resize-none min-h-[2.5rem] max-h-[10rem] bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent rounded-md"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-md shadow-md transition-colors duration-200"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                                送信中...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PerplexityChatApp;
