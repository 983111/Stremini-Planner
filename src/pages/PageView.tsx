import { useParams } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/api";
import { v4 as uuidv4 } from "uuid";
import { Sparkles, CheckCircle2, Circle, Code2 } from "lucide-react";
import { askGemini, safeJsonParse } from "../lib/ai";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Block = { id: string; type: string; text: string };
type ChatMessage = { role: 'user' | 'model', text: string };

const getBlockPlaceholder = (type: string) => {
  if (type === 'h1') return 'Heading 1';
  if (type === 'h2') return 'Heading 2';
  if (type === 'quote') return 'Quote';
  if (type === 'code') return 'Code block';
  if (type === 'callout') return 'Callout';
  return "Type '/' for commands...";
};

const getBlockClassName = (block: Block) => {
  if (block.type === 'h1') return 'text-3xl font-bold tracking-tight mt-8 mb-4 text-zinc-900';
  if (block.type === 'h2') return 'text-2xl font-semibold tracking-tight mt-6 mb-3 text-zinc-800';
  if (block.type === 'quote') return 'text-base italic leading-relaxed border-l-4 border-zinc-300 pl-4 text-zinc-600';
  if (block.type === 'code') return 'text-sm font-mono leading-6 bg-zinc-900 text-zinc-100 rounded-md px-3 py-2';
  if (block.type === 'callout') return 'text-base leading-relaxed bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-amber-900';
  return 'text-base leading-relaxed';
};

const renderMarkdownText = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1">
        {listBuffer.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    );
    listBuffer = [];
  };

  const flushCode = () => {
    if (!codeBuffer.length) return;
    elements.push(
      <pre key={`code-${elements.length}`} className="bg-zinc-900 text-zinc-100 text-xs rounded-md p-3 overflow-x-auto font-mono">
        {codeBuffer.join('\n')}
      </pre>
    );
    codeBuffer = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2));
      continue;
    }

    flushList();

    if (!line.trim()) continue;
    if (line.startsWith('## ')) elements.push(<h4 key={`h4-${elements.length}`} className="font-semibold text-zinc-800">{line.slice(3)}</h4>);
    else if (line.startsWith('# ')) elements.push(<h3 key={`h3-${elements.length}`} className="font-semibold text-zinc-900">{line.slice(2)}</h3>);
    else elements.push(<p key={`p-${elements.length}`} className="leading-relaxed">{line}</p>);
  }

  flushList();
  if (inCode) flushCode();

  if (!elements.length) return <span>{text}</span>;
  return <div className="space-y-2">{elements}</div>;
};

export function PageView() {
  const { pageId } = useParams();
  const [page, setPage] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitle] = useState('');
  
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [streamingPreview, setStreamingPreview] = useState('');

  useEffect(() => {
    if (!pageId) return;
    const unsubscribe = onSnapshot(doc(db, 'pages', pageId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPage({ id: docSnap.id, ...data });
        setTitle(data.title || '');
        try {
          const parsed = JSON.parse(data.blocks || '[]');
          setBlocks(Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ id: uuidv4(), type: 'p', text: '' }]);
        } catch(e) {
          setBlocks([{ id: uuidv4(), type: 'p', text: '' }]);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `pages/${pageId}`));
    return () => unsubscribe();
  }, [pageId]);

  const saveBlocks = async (newBlocks: Block[]) => {
    if (!pageId || !page) return;
    try {
      await updateDoc(doc(db, 'pages', pageId), {
        blocks: JSON.stringify(newBlocks),
        updatedAt: serverTimestamp()
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const updateTitle = async (newTitle: string) => {
    setTitle(newTitle);
    if (!pageId) return;
    await updateDoc(doc(db, 'pages', pageId), { title: newTitle, updatedAt: serverTimestamp() });
  };

  const handleBlockChange = (id: string, text: string) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, text } : b);
    setBlocks(newBlocks);
  };
  
  const handleBlockBlur = () => {
    saveBlocks(blocks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, id: string, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Add generic block below
      const text = blocks[index].text;
      
      // Basic markdown parsing to change type
      const newBlocks = [...blocks];
      if (text.startsWith('# ')) {
        newBlocks[index] = { ...newBlocks[index], text: text.slice(2), type: 'h1' };
      } else if (text.startsWith('## ')) {
        newBlocks[index] = { ...newBlocks[index], text: text.slice(3), type: 'h2' };
      } else if (text.startsWith('- ')) {
        newBlocks[index] = { ...newBlocks[index], text: text.slice(2), type: 'list' };
      } else if (text.startsWith('> ')) {
        newBlocks[index] = { ...newBlocks[index], text: text.slice(2), type: 'quote' };
      } else if (text.startsWith('```')) {
        newBlocks[index] = { ...newBlocks[index], text: text.replace(/^```/, '').trim(), type: 'code' };
      } else if (text.startsWith('! ')) {
        newBlocks[index] = { ...newBlocks[index], text: text.slice(2), type: 'callout' };
      } else if (text.startsWith('[] ')) {
        newBlocks[index] = { ...newBlocks[index], text: text.slice(3), type: 'todo' };
      }
      
      const newBlockId = uuidv4();
      newBlocks.splice(index + 1, 0, { id: newBlockId, type: newBlocks[index].type === 'list' || newBlocks[index].type === 'todo' ? newBlocks[index].type : 'p', text: '' });
      setBlocks(newBlocks);
      
      setTimeout(() => document.getElementById(`block-${newBlockId}`)?.focus(), 10);
    } else if (e.key === 'Backspace' && blocks[index].text === '' && blocks.length > 1) {
      e.preventDefault();
      const newBlocks = blocks.filter(b => b.id !== id);
      setBlocks(newBlocks);
      const prevId = blocks[index - 1]?.id || blocks[0].id;
      setTimeout(() => document.getElementById(`block-${prevId}`)?.focus(), 10);
    }
  };

  const runAiCommand = async () => {
    if (!aiPrompt || !pageId) return;
    setIsGenerating(true);
    
    const userPrompt = aiPrompt;
    setChatHistory(h => [...h, { role: 'user', text: userPrompt }]);
    setAiPrompt('');
    setStreamingPreview('');

    try {
      const contentStr = blocks.map(b => `[${b.type}] ${b.text}`).join('\n');
      const instruction = `You are a helpful writing assistant working on a document. 
Current Document state:
${contentStr}

Task: Return ONLY a valid JSON object matching the requested schema. If the user asks to summarize, rewrite, or replace the text, set action to "replace" and return ALL blocks. If the user asks to continue, add, or append to the text, set action to "append" and return ONLY the new blocks. CRITICAL: Use more varied block types ('h1', 'h2', 'p', 'todo', 'list') to provide rich and meaningful structure based on the request and context.`;
      
      const res = await askGemini(instruction, userPrompt, true, chatHistory);
      const parsed = safeJsonParse(res);
      setStreamingPreview(res);
      
      if (parsed && Array.isArray(parsed.blocks)) {
        let newBlocks = blocks;
        if (parsed.action === 'replace') {
          newBlocks = parsed.blocks.map((b:any)=>({...b, id: uuidv4()}));
        } else {
          newBlocks = [...blocks.filter(b => b.text.trim() !== ''), ...parsed.blocks.map((b:any)=>({...b, id: uuidv4()})) ];
        }
        setBlocks(newBlocks);
        await saveBlocks(newBlocks);
        setChatHistory(h => [...h, { role: 'model', text: `I updated the document (${parsed.action || 'append'}).` }]);
      } else {
        setChatHistory(h => [...h, { role: 'model', text: "⚠️ I couldn't modify the document based on that request." }]);
      }
    } catch(e) {
      console.error(e);
      setChatHistory(h => [...h, { role: 'model', text: "⚠️ Sorry, I encountered an error." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const runSummarize = async () => {
    setIsGenerating(true);
    setAiPanelOpen(true);
    setChatHistory(h => [...h, { role: 'user', text: "Summarize this document." }]);
    try {
      const contentStr = blocks.map(b => `[${b.type}] ${b.text}`).join('\n');
      const instruction = `You are a helpful writing assistant. 
Current Document state:
${contentStr}

Task: Return ONLY a valid JSON object matching the requested schema with action "append". Summarize the document accurately and concisely based on its current contents. Return the summary as a new block (e.g. type 'p' or 'list').`;
      const res = await askGemini(instruction, "Summarize this document concisely.", true, chatHistory);
      const parsed = safeJsonParse(res);
      if (parsed && Array.isArray(parsed.blocks)) {
        const newBlocks = [...blocks.filter(b => b.text.trim() !== ''), { id: uuidv4(), type: 'h2', text: 'Summary' }, ...parsed.blocks.map((b:any)=>({...b, id: uuidv4()}))];
        setBlocks(newBlocks);
        await saveBlocks(newBlocks);
        setChatHistory(h => [...h, { role: 'model', text: `I've added a concise summary to the end of the document.` }]);
      } else {
        setChatHistory(h => [...h, { role: 'model', text: "⚠️ I couldn't generate a summary." }]);
      }
    } catch(e) {
      console.error(e);
      setChatHistory(h => [...h, { role: 'model', text: "⚠️ Sorry, I encountered an error while trying to summarize. Please try again." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  if (!page) return null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header/Breadcrumbs */}
      <header className="h-12 w-full flex-shrink-0 flex items-center justify-between px-6 border-b border-[#EDECE9] bg-white">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-[#37352F] font-medium">{title || 'Untitled'}</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={runSummarize} className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 flex items-center px-3 py-1.5 rounded-md font-medium transition-colors">
            <Sparkles className="w-3 h-3 mr-1" /> Summarize
          </button>
          <button className="text-xs text-gray-500 hover:bg-[#EBEAEA] px-3 py-1.5 rounded-md">Updates</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
      <div className="p-12 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto w-full">
          <div className="mb-4 group relative flex items-center gap-4">
           {/* Replaced massive emoji with a sleek clean design */}
           <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-all mt-4 mb-2">
             <Sparkles className="w-4 h-4 mr-1.5" /> Continue with AI...
           </button>
        </div>
        
        <input 
          className="w-full text-5xl font-bold tracking-tight text-zinc-900 bg-transparent outline-none mb-10 placeholder-zinc-300"
          placeholder="Untitled"
          value={title}
          onChange={e => updateTitle(e.target.value)}
        />

        <div className="space-y-1 pb-32">
          {blocks.map((block, i) => (
            <div key={block.id} className="relative group flex items-start">
              {block.type === 'todo' && (
                <div 
                  className="mt-3 mr-3 cursor-pointer text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
                  onClick={() => {
                    const isChecked = block.text.startsWith('[x]');
                    const newText = (!isChecked ? '[x] ' : '') + block.text.replace(/^\[x\]\s*/, '');
                    handleBlockChange(block.id, newText);
                    saveBlocks(blocks.map(b => b.id === block.id ? { ...b, text: newText } : b));
                  }}
                >
                  {block.text.startsWith('[x]') ? <CheckCircle2 className="w-5 h-5 text-zinc-800" /> : <Circle className="w-5 h-5" />}
                </div>
              )}
              {block.type === 'list' && (
                <div className="mt-3 mr-3 w-4 h-4 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
                </div>
              )}
              
              <textarea
                id={`block-${block.id}`}
                value={block.text.replace(/^\[x\]\s*/, '')}
                onChange={e => {
                  const prefix = block.type === 'todo' && block.text.startsWith('[x]') ? '[x] ' : '';
                  handleBlockChange(block.id, prefix + e.target.value);
                }}
                onBlur={handleBlockBlur}
                onKeyDown={e => handleKeyDown(e as any, block.id, i)}
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                className={`w-full bg-transparent outline-none resize-none py-2 min-h-[38px] text-zinc-800 placeholder-zinc-300 overflow-hidden ${getBlockClassName(block)} ${block.type === 'todo' && block.text.startsWith('[x]') ? 'line-through text-zinc-400' : ''}`}
                placeholder={getBlockPlaceholder(block.type)}
              />
            </div>
          ))}
        </div>
      </div>
      </div>
      
      {aiPanelOpen && (
        <div className="w-80 border-l border-zinc-200 bg-zinc-50 flex flex-col shadow-sm z-10 shrink-0">
          <div className="h-12 border-b border-zinc-200 flex items-center justify-between px-4 font-medium text-zinc-800">
            <div className="flex items-center">
              <Sparkles className="w-4 h-4 text-purple-500 mr-2" /> AI Assistant
            </div>
            {chatHistory.length > 0 && (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="text-xs font-normal text-zinc-400 hover:text-red-500 transition-colors px-2 py-1"
                title="Clear Chat"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-sm text-zinc-500 text-center mt-4">
                Ask me to draft content, summarize, or edit the document.
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`text-sm py-2 px-3 rounded-lg max-w-[90%] ${
                  msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white border border-zinc-200 text-zinc-800'
                }`}>
                  {msg.role === 'model' ? renderMarkdownText(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-white border border-purple-200 shadow-sm text-purple-600 text-sm py-3 px-4 rounded-lg flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs font-medium animate-pulse">AI is thinking...</span>
                </div>
              </div>
            )}
            {streamingPreview && (
              <div className="flex justify-start">
                <div className="bg-white border border-zinc-200 text-zinc-700 text-xs py-2 px-3 rounded-lg max-w-[90%] space-y-1">
                  <div className="font-medium flex items-center gap-1 text-zinc-500"><Code2 className="w-3 h-3" /> Live JSON preview</div>
                  <pre className="whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{streamingPreview}</pre>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-zinc-200 bg-white">
            <div className="relative">
              <Input
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAiCommand()}
                placeholder="Ask AI..."
                className="pr-10"
                disabled={isGenerating}
              />
              <button 
                onClick={runAiCommand} 
                disabled={!aiPrompt || isGenerating}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 disabled:opacity-50"
              >
                 <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Chat History</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-500 mb-4">
            Are you sure you want to clear the AI chat history for this document? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 mt-2">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              setChatHistory([]);
              setShowClearConfirm(false);
            }}>Clear</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
