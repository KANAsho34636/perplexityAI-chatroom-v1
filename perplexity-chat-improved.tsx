import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  MessageSquare, 
  AlertTriangle, 
  Loader2, 
  Settings, 
  Download, 
  Moon, 
  Sun, 
  Trash2, 
  RotateCcw,
  Info,
  Copy
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// クラス名を条件付きで結合するユーティリティ関数
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// UUIDを生成するヘルパー関数
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 日付フォーマット用のヘルパー関数
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('日付フォーマットエラー:', e);
    return '';
  }
};

// マークダウン風のテキスト整形関数
const formatMarkdown = (text) => {
  if (!text) return null;
  
  try {
    // コードブロックの処理
    let formattedText = text.replace(/```(.*?)\n([\s\S]*?)```/g, 
      (_, language, code) => `<pre class="bg-gray-800 p-4 rounded-md overflow-x-auto my-2"><code class="text-gray-200">${code}</code></pre>`
    );
    
    // インラインコードの処理
    formattedText = formattedText.replace(/`([^`]+)`/g, 
      (_, code) => `<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">${code}</code>`
    );
    
    // 見出しの処理
    formattedText = formattedText.replace(/^### (.*?)$/gm, 
      (_, heading) => `<h3 class="text-lg font-bold my-2">${heading}</h3>`
    );
    formattedText = formattedText.replace(/^## (.*?)$/gm, 
      (_, heading) => `<h2 class="text-xl font-bold my-3">${heading}</h2>`
    );
    formattedText = formattedText.replace(/^# (.*?)$/gm, 
      (_, heading) => `<h1 class="text-2xl font-bold my-4">${heading}</h1>`
    );
    
    // リストの処理
    formattedText = formattedText.replace(/^\* (.*?)$/gm, 
      (_, item) => `<li class="ml-4">• ${item}</li>`
    );
    formattedText = formattedText.replace(/^\d+\. (.*?)$/gm, 
      (match, item) => `<li class="ml-4">${match}</li>`
    );
    
    // 太字の処理
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, 
      (_, text) => `<strong>${text}</strong>`
    );
    
    // 斜体の処理
    formattedText = formattedText.replace(/\*(.*?)\*/g, 
      (_, text) => `<em>${text}</em>`
    );
    
    // 改行の処理
    formattedText = formattedText.replace(/\n/g, '<br />');
    
    return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
  } catch (e) {
    console.error('マークダウン変換エラー:', e);
    return <div>{text}</div>;
  }
};

// Perplexityのモデル情報
const PERPLEXITY_MODELS = [
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama 3.1 Sonar Large (128k)' },
  { id: 'llama-3.1-sonar-small-128k-online', name: 'Llama 3.1 Sonar Small (128k)' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
  { id: 'sonar-small-online', name: 'Sonar Small' },
  { id: 'sonar-medium-online', name: 'Sonar Medium' },
  { id: 'codellama-70b-instruct', name: 'CodeLlama 70B' },
  { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B' }
];

// チャットアプリのメインコンポーネント
const PerplexityChatApp = () => {
  // 基本的な状態
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [tempApiKey, setTempApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-sonar-large-128k-online');
  const [systemPrompt, setSystemPrompt] = useState('あなたは有能なアシスタントです。');
  const [chatHistories, setChatHistories] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(generateUUID());
  const [currentChat, setCurrentChat] = useState({
    id: generateUUID(),
    title: '新しいチャット',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  // refs
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  
  // 初期化処理
  useEffect(() => {
    // ダークモードの設定を読み込む（エラーハンドリング付き）
    try {
      const savedDarkMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedDarkMode === 'true' || (savedDarkMode === null && prefersDark)) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('ダークモード初期化エラー:', error);
    }
    
    // APIキーを読み込む
    try {
      const storedApiKey = localStorage.getItem('perplexityApiKey') || '';
      setApiKey(storedApiKey);
      setShowApiKeyInput(!storedApiKey);
      
      // モデルとシステムプロンプトを読み込む
      const storedModel = localStorage.getItem('perplexityModel') || 'llama-3.1-sonar-large-128k-online';
      setSelectedModel(storedModel);
      
      const storedPrompt = localStorage.getItem('systemPrompt') || 'あなたは有能なアシスタントです。';
      setSystemPrompt(storedPrompt);
      
      // チャット履歴を読み込む
      const savedHistories = localStorage.getItem('chatHistories');
      const parsedHistories = savedHistories ? JSON.parse(savedHistories) : [];
      setChatHistories(parsedHistories);
      
      // 現在のチャットIDを設定
      const savedChatId = localStorage.getItem('currentChatId');
      const newChatId = savedChatId || generateUUID();
      setCurrentChatId(newChatId);
      
      // すぐにメッセージを表示するために初期メッセージを設定
      if (!storedApiKey) {
        setMessages([{
          id: 'system-welcome-' + Date.now(),
          role: 'system',
          content: "Perplexity AI チャットへようこそ！\n設定ボタンをクリックして、Perplexity AIのAPIキーを入力してください。",
          timestamp: Date.now()
        }]);
      } else {
        setMessages([{
          id: 'system-start-' + Date.now(),
          role: 'system',
          content: "チャットを開始します。\n質問を入力して送信してください。",
          timestamp: Date.now()
        }]);
      }
    } catch (e) {
      console.error('初期化エラー:', e);
      setMessages([{
        id: 'system-error-' + Date.now(),
        role: 'system',
        content: "エラーが発生しました。ページを再読み込みしてください。",
        timestamp: Date.now()
      }]);
    }
  }, []);
  
  // 現在のチャットIDが変更されたときに、そのチャットの内容を取得する
  useEffect(() => {
    if (currentChatId && chatHistories.length > 0) {
      const chat = chatHistories.find(chat => chat.id === currentChatId);
      if (chat) {
        setCurrentChat(chat);
        if (chat.messages && chat.messages.length > 0) {
          setMessages(chat.messages);
        }
      } else {
        // 該当するチャットがない場合は新しいチャットを作成
        const newChat = {
          id: currentChatId,
          title: '新しいチャット',
          messages: messages.length > 0 ? messages : [{
            id: 'system-new-' + Date.now(),
            role: 'system',
            content: "新しいチャットを開始します。\n質問を入力して送信してください。",
            timestamp: Date.now()
          }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setCurrentChat(newChat);
        if (messages.length === 0) {
          setMessages(newChat.messages);
        }
      }
    }
  }, [currentChatId, chatHistories]);
  
  // ダークモードの切り替え
  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', darkMode.toString());
    } catch (error) {
      console.error('ダークモード切り替えエラー:', error);
    }
  }, [darkMode]);
  
  // ダークモード切り替え関数
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
  };
  
  // スクロール処理
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // inputのリサイズ
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);
  
  // チャット履歴の保存
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      try {
        // 現在のチャットを更新
        const updatedChat = {
          ...currentChat,
          messages: messages,
          updatedAt: Date.now()
        };
        
        // タイトルが「新しいチャット」の場合は、最初のユーザーメッセージをタイトルにする
        if (updatedChat.title === '新しいチャット') {
          const firstUserMessage = messages.find(msg => msg.role === 'user');
          if (firstUserMessage) {
            const truncatedTitle = firstUserMessage.content.length > 30 
              ? firstUserMessage.content.substring(0, 30) + '...' 
              : firstUserMessage.content;
            updatedChat.title = truncatedTitle;
          }
        }
        
        // チャット履歴を更新
        setCurrentChat(updatedChat);
        
        const existingIndex = chatHistories.findIndex(chat => chat.id === currentChatId);
        const newHistories = [...chatHistories];
        
        if (existingIndex >= 0) {
          newHistories[existingIndex] = updatedChat;
        } else {
          newHistories.push(updatedChat);
        }
        
        setChatHistories(newHistories);
        localStorage.setItem('chatHistories', JSON.stringify(newHistories));
        localStorage.setItem('currentChatId', currentChatId);
      } catch (e) {
        console.error('チャット履歴保存エラー:', e);
      }
    }
  }, [messages, currentChatId]);
  
  // APIキー設定処理
  const handleApiKeySubmit = () => {
    if (tempApiKey.trim()) {
      try {
        setApiKey(tempApiKey.trim());
        localStorage.setItem('perplexityApiKey', tempApiKey.trim());
        setShowApiKeyInput(false);
        setError(null);
        
        // APIキーが設定されたら新しいメッセージを追加
        const newMessage = {
          id: 'system-apikey-' + Date.now(),
          role: 'system',
          content: "APIキーが設定されました。チャットを開始できます。",
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, newMessage]);
      } catch (e) {
        console.error('APIキー設定エラー:', e);
        setError('APIキーの保存中にエラーが発生しました。');
      }
    } else {
      setError('APIキーを入力してください。');
    }
  };
  
  // モデル設定処理
  const handleModelChange = (value) => {
    try {
      setSelectedModel(value);
      localStorage.setItem('perplexityModel', value);
    } catch (e) {
      console.error('モデル設定エラー:', e);
    }
  };
  
  // システムプロンプト設定処理
  const handleSystemPromptChange = (value) => {
    try {
      setSystemPrompt(value);
      localStorage.setItem('systemPrompt', value);
    } catch (e) {
      console.error('システムプロンプト設定エラー:', e);
    }
  };
  
  // 新しいチャットを作成
  const createNewChat = () => {
    try {
      const newId = generateUUID();
      const newChat = {
        id: newId,
        title: '新しいチャット',
        messages: [{
          id: 'system-new-' + Date.now(),
          role: 'system',
          content: "新しいチャットを開始します。\n質問を入力して送信してください。",
          timestamp: Date.now()
        }],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setCurrentChatId(newId);
      setCurrentChat(newChat);
      setMessages(newChat.messages);
      setError(null);
    } catch (e) {
      console.error('新規チャット作成エラー:', e);
      setError('新しいチャットの作成に失敗しました。');
    }
  };
  
  // チャット履歴を読み込む
  const loadChatHistory = (chatId) => {
    if (!chatId) return;
    
    try {
      const selectedChat = chatHistories.find(chat => chat.id === chatId);
      if (selectedChat) {
        setCurrentChatId(chatId);
        setCurrentChat(selectedChat);
        setMessages(selectedChat.messages || []);
        setError(null);
      }
    } catch (e) {
      console.error('チャット履歴読み込みエラー:', e);
      setError('チャット履歴の読み込みに失敗しました。');
    }
  };
  
  // チャット履歴を削除
  const deleteChatHistory = (chatId) => {
    try {
      const newHistories = chatHistories.filter(chat => chat.id !== chatId);
      setChatHistories(newHistories);
      localStorage.setItem('chatHistories', JSON.stringify(newHistories));
      
      if (chatId === currentChatId) {
        createNewChat();
      }
    } catch (e) {
      console.error('チャット履歴削除エラー:', e);
      setError('チャット履歴の削除に失敗しました。');
    }
  };
  
  // チャット履歴をエクスポート
  const exportChatHistory = () => {
    if (currentChat && currentChat.id) {
      try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentChat, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `perplexity-chat-${currentChat.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      } catch (e) {
        console.error('チャットエクスポートエラー:', e);
        setError('チャット履歴のエクスポートに失敗しました。');
      }
    }
  };
  
  // メッセージコピー機能
  const copyMessageContent = (messageId, content) => {
    try {
      navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (e) {
      console.error('コピーエラー:', e);
      setError('メッセージのコピーに失敗しました。');
    }
  };
  
  // メッセージ送信処理
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    try {
      const userMessageId = generateUUID();
      const userMessage = { 
        id: userMessageId, 
        role: 'user', 
        content: input.trim(),
        timestamp: Date.now()
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);
      setError(null);
      
      if (!apiKey) {
        throw new Error("APIキーが設定されていません。設定ボタンからAPIキーを入力してください。");
      }
      
      // 送信するメッセージ履歴の準備
      // システムメッセージは除外し、最新のものだけを追加
      const messagesToSend = newMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({ role: msg.role, content: msg.content }));
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messagesToSend
          ],
          stream: false,
          max_tokens: 1024,
          temperature: 0.7,
          frequency_penalty: 0.5
        })
      });
      
      if (!response.ok) {
        let errorMessage = `APIリクエストエラー: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += ` - ${errorData.error?.message || JSON.stringify(errorData)}`;
          
          // APIキーエラーの場合は特別なメッセージ
          if (response.status === 401) {
            errorMessage = "APIキーが無効です。設定から正しいAPIキーを入力してください。";
            setShowApiKeyInput(true);
          }
        } catch (parseError) {
          errorMessage += ' - レスポンス解析エラー';
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      const assistantResponse = { 
        id: generateUUID(), 
        role: 'assistant', 
        content: data.choices[0].message.content.trim(),
        timestamp: Date.now()
      };
      
      setMessages([...newMessages, assistantResponse]);
    } catch (err) {
      setError(err.message || '不明なエラーが発生しました。');
      // エラーメッセージはシステムメッセージとして追加
      setMessages(prevMessages => [...prevMessages, { 
        id: 'system-error-' + Date.now(), 
        role: 'system', 
        content: `エラー: ${err.message || '不明なエラーが発生しました。'}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enterキーで送信、Shift+Enterで改行
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="flex flex-col md:flex-row h-full">
        {/* サイドバー */}
        <div className="md:w-64 bg-gray-200 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Perplexity Chat</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleDarkMode} 
                    className="ml-auto"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="p-2">
            <Button 
              onClick={createNewChat} 
              className="w-full justify-start"
              variant="outline"
            >
              <MessageSquare className="mr-2 w-4 h-4" />
              新しいチャット
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">
              チャット履歴
            </h2>
            {chatHistories.length > 0 ? (
              <div className="space-y-1">
                {chatHistories
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(chat => (
                    <div 
                      key={chat.id} 
                      className={`flex items-center p-2 rounded-md text-sm cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors ${
                        currentChatId === chat.id ? 'bg-gray-300 dark:bg-gray-700' : ''
                      }`}
                    >
                      <div 
                        className="flex-1 truncate text-gray-800 dark:text-gray-200"
                        onClick={() => loadChatHistory(chat.id)}
                      >
                        {chat.title}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(chat.updatedAt)}
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="ml-1 hover:bg-red-100 dark:hover:bg-red-900"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChatHistory(chat.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>削除</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm p-4">
                チャット履歴がありません
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-300 dark:border-gray-700">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 w-4 h-4" />
                  設定
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Perplexity AI 設定</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="api" className="w-full">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="api">API設定</TabsTrigger>
                    <TabsTrigger value="model">モデル設定</TabsTrigger>
                    <TabsTrigger value="prompt">プロンプト</TabsTrigger>
                  </TabsList>
                  <TabsContent value="api" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">Perplexity API キー</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="APIキー"
                        value={tempApiKey || apiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        APIキーは端末に保存され、Perplexity AI APIとの通信にのみ使用されます。
                      </p>
                    </div>
                    <Button 
                      onClick={handleApiKeySubmit} 
                      disabled={!tempApiKey && !apiKey}
                      className="mt-4"
                    >
                      APIキーを保存
                    </Button>
                  </TabsContent>
                  <TabsContent value="model" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-select">モデルを選択</Label>
                      <Select
                        value={selectedModel}
                        onValueChange={handleModelChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="モデルを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERPLEXITY_MODELS.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        モデルによって機能や応答品質、速度が異なります。
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="prompt" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="system-prompt">システムプロンプト</Label>
                      <Textarea
                        id="system-prompt"
                        placeholder="AIの振る舞いを指定するシステムプロンプトを入力"
                        value={systemPrompt}
                        onChange={(e) => handleSystemPromptChange(e.target.value)}
                        rows={4}
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        AIの振る舞いや知識、応答スタイルを定義します。
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* チャットヘッダー */}
          <div className="p-3 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
              {currentChat.title}
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={exportChatHistory} 
                    title="チャットをエクスポート"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>チャットをエクスポート</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* チャット画面 */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900" ref={chatContainerRef}>
            {messages.map((message) => {
              // メッセージIDがない場合は生成する（システムが点滅するのを防ぐため）
              const messageId = message.id || `msg-${message.role}-${message.timestamp || Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              
              return (
                <div
                  key={messageId}
                  className={cn(
                    'group mb-4 rounded-lg shadow-sm max-w-[85%] md:max-w-[75%] relative',
                    message.role === 'user'
                      ? 'ml-auto bg-blue-100 dark:bg-blue-900 p-4'
                      : message.role === 'assistant'
                        ? 'mr-auto bg-white dark:bg-gray-800 p-4'
                        : 'mx-auto bg-gray-200 dark:bg-gray-800 p-3 max-w-[90%]'
                  )}
                >
                  {message.role === 'system' ? (
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      <div className="flex items-center mb-1">
                        <MessageSquare className="inline-block mr-2 w-4 h-4" />
                        <span className="font-medium">システム</span>
                      </div>
                      <div className="pl-6">{message.content}</div>
                    </div>
                  ) : (
                    <div>
                      <div className={cn(
                        'flex items-center mb-2',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}>
                        <span className={cn(
                          'font-medium text-sm',
                          message.role === 'user' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {message.role === 'user' ? 'あなた' : 'AI'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                      <div className={cn(
                        'text-gray-900 dark:text-white whitespace-pre-wrap break-words',
                      )}>
                        {formatMarkdown(message.content)}
                      </div>
                      
                      {/* コピーボタン */}
                      {message.role !== 'system' && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyMessageContent(messageId, message.content)}
                                >
                                  {copiedMessageId === messageId ? (
                                    <span className="text-xs text-green-600 dark:text-green-400">コピー済み</span>
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>メッセージをコピー</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {isLoading && (
              <div
                className="mb-4 p-4 rounded-lg bg-white dark:bg-gray-800 mr-auto max-w-[85%] md:max-w-[75%] shadow-sm"
              >
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                  <span>AI応答を生成中...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div
                className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700 mx-auto max-w-md"
              >
                <div className="flex items-start">
                  <AlertTriangle className="inline-block mr-2 w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">エラーが発生しました</div>
                    <div className="text-sm">{error}</div>
                    {error.includes('APIキー') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setShowApiKeyInput(true)}
                      >
                        <Settings className="w-4 h-4 mr-1" /> APIキーを設定
                      </Button>
                    )}
                    {error.includes('API') && !error.includes('APIキー') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => sendMessage()}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" /> 再試行
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 入力欄 */}
          <div className="p-3 md:p-4 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
            <div className="flex items-start gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={apiKey ? "メッセージを入力..." : "APIキーを設定してください..."}
                className="flex-1 resize-none min-h-[2.5rem] max-h-[10rem] bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md border border-gray-300 dark:border-gray-700"
                disabled={isLoading || !apiKey}
              />
              <div className="flex flex-col gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim() || !apiKey}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        size="icon"
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>送信</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div>Shift+Enter で改行</div>
              <div className="flex items-center">
                <Info className="w-3 h-3 mr-1" />
                モデル: {PERPLEXITY_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* APIキー入力モーダル */}
      {showApiKeyInput && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Perplexity AI APIキーを入力
            </h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              チャットを始めるには、Perplexity AIのAPIキーが必要です。
              APIキーは<a 
                href="https://www.perplexity.ai/settings/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >Perplexityのウェブサイト</a>で取得できます。
            </p>
            <Input
              type="password"
              placeholder="pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApiKeySubmit();
                }
              }}
            />
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowApiKeyInput(false)}
              >
                キャンセル
              </Button>
              <Button onClick={handleApiKeySubmit}>
                設定
              </Button>
            </div>
            {error && (
              <p className="text-red-500 mt-2 text-sm">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerplexityChatApp;
