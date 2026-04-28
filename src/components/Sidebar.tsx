import { Plus, FileText, Database, LogOut, ChevronDown, Sparkles, LayoutTemplate, Briefcase, List, Book, Layers, CircleDot } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { logout, auth, db } from '../lib/firebase';
import { Button } from './ui/button';
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { handleFirestoreError, OperationType } from '../lib/api';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { askGeminiForDatabaseSchema, safeJsonParse } from '../lib/ai';
import { TEMPLATES, Template } from '../lib/templates';

const getCategoryIcon = (category: string) => {
  if (category.includes('Work')) return <Briefcase className="w-5 h-5 text-zinc-400" />;
  if (category.includes('Education')) return <Book className="w-5 h-5 text-zinc-400" />;
  if (category.includes('Personal')) return <List className="w-5 h-5 text-zinc-400" />;
  return <Layers className="w-5 h-5 text-zinc-400" />;
}

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pages'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPages(data.sort((a: any, b: any) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pages');
    });
    return () => unsubscribe();
  }, [user]);

  const createBlank = async (type: 'document' | 'database') => {
    if (!user) return;
    try {
      const p = await addDoc(collection(db, 'pages'), {
        title: 'Untitled',
        type,
        blocks: '[]',
        schema: type === 'database' ? JSON.stringify([
          { key: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] }
        ]) : '{}',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/${type === 'document' ? 'page' : 'database'}/${p.id}`);
    } catch (e: any) {
      console.error(e);
      alert('Error creating item: ' + e.message);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    if (!user) return;
    try {
      const template = TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      const p = await addDoc(collection(db, 'pages'), {
        title: template.title,
        type: template.type,
        blocks: JSON.stringify(template.blocks || []),
        schema: JSON.stringify(template.schema || []),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      if (template.type === 'database' && template.initialTasks && template.initialTasks.length > 0) {
        for (const task of template.initialTasks) {
          await addDoc(collection(db, 'records'), {
            title: task.title,
            databaseId: p.id,
            properties: JSON.stringify(task.properties || {}),
            blocks: '[]',
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      setIsTemplateDialogOpen(false);
      navigate(`/${template.type === 'document' ? 'page' : 'database'}/${p.id}`);
    } catch (e: any) {
      console.error(e);
      alert('Error creating from template: ' + e.message);
    }
  };

  const createWithAI = async () => {
    if (!user || !aiPrompt) return;
    setIsGenerating(true);
    try {
      const res = await askGeminiForDatabaseSchema(
        `Create a Notion-like database schema for: "${aiPrompt}". Provide a relevant title, 4-8 schema columns containing a good mix of types ('text', 'select', 'date', 'status', 'number', 'checkbox', 'formula', 'relation') that optimally fit this topic. Ensure realistic and varied select/status options and diverse content.`
      );
      const data = safeJsonParse(res) || {};
      const schema = (Array.isArray(data.schema) ? data.schema : []).map((c: any) => ({
        key: c.key || c.name?.toLowerCase().replace(/\s+/g, '') || '',
        name: c.name || 'Untitled',
        type: c.type || 'text',
        options: c.options || []
      }));

      const dbDoc = await addDoc(collection(db, 'pages'), {
        title: data.title || 'AI Generated DB',
        type: 'database',
        blocks: '[]',
        schema: JSON.stringify(schema),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (Array.isArray(data.initialTasks) && data.initialTasks.length > 0) {
         for (const task of data.initialTasks) {
            await addDoc(collection(db, 'records'), {
              title: task.title || 'Untitled',
              databaseId: dbDoc.id,
              properties: JSON.stringify(task.properties || {}),
              blocks: '[]',
              ownerId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
         }
      }

      setIsAiDialogOpen(false);
      setAiPrompt('');
      navigate(`/database/${dbDoc.id}`);
    } catch (e: any) {
      console.error(e);
      alert('AI Generation failed. ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <aside className="w-64 bg-zinc-50 border-r border-zinc-200 h-full flex flex-col pt-4">
      <div className="px-3 mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full outline-none items-center space-x-2 p-2 hover:bg-zinc-200/50 rounded-md cursor-pointer transition-colors">
            <div className="w-5 h-5 bg-zinc-800 rounded text-xs text-white flex items-center justify-center font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-zinc-900 truncate flex-1 text-left">{user?.email}'s Workspace</span>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuItem className="text-sm cursor-pointer" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3 pb-4 space-y-1">
        <div className="px-2 text-[10px] font-semibold text-zinc-400 mb-2 uppercase tracking-widest">Create</div>
        <button onClick={() => createBlank('document')} className="w-full flex items-center px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200/50 hover:text-zinc-900 rounded-md group transition-colors">
          <FileText className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-zinc-600" />
          New Document
        </button>
        <button onClick={() => createBlank('database')} className="w-full flex items-center px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200/50 hover:text-zinc-900 rounded-md group transition-colors">
          <Database className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-zinc-600" />
          New Database
        </button>
        <button onClick={() => setIsTemplateDialogOpen(true)} className="w-full flex items-center px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200/50 hover:text-zinc-900 rounded-md group transition-colors">
          <LayoutTemplate className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-zinc-600" />
          Templates
        </button>
        <button onClick={() => setIsAiDialogOpen(true)} className="w-full flex items-center px-2 py-1.5 text-sm font-medium text-zinc-900 hover:bg-purple-100 bg-purple-50 mt-2 rounded-md group transition-colors">
          <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
          Automate with AI
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        <div className="px-5 text-[10px] font-semibold text-zinc-400 mb-2 uppercase tracking-widest">Workspace</div>
        <div className="space-y-0.5 px-3">
          {pages.map((p) => (
            <NavLink 
              key={p.id} 
              to={`/${p.type === 'document' ? 'page' : 'database'}/${p.id}`}
              className={({ isActive }) => 
                `flex items-center px-2 py-1.5 text-sm rounded-md truncate transition-colors ${
                  isActive ? 'bg-zinc-200/70 text-zinc-900 font-medium' : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                }`
              }
            >
              {p.type === 'document' ? (
                <FileText className={`w-4 h-4 mr-2 shrink-0 ${window.location.pathname.includes(p.id) ? 'text-zinc-900' : 'text-zinc-400'}`} />
              ) : (
                <Database className={`w-4 h-4 mr-2 shrink-0 ${window.location.pathname.includes(p.id) ? 'text-zinc-900' : 'text-zinc-400'}`} />
              )}
              <span className="truncate">{p.title || 'Untitled'}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-full bg-white border-zinc-200/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium tracking-tight text-zinc-900">Choose a Template</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-10">
            {Array.from(new Set(TEMPLATES.map(t => t.category))).map(category => (
              <div key={category}>
                <div className="flex items-center space-x-2 mb-4 text-zinc-400">
                  {getCategoryIcon(category)}
                  <h3 className="text-sm font-medium tracking-wide uppercase text-zinc-500">{category}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TEMPLATES.filter(t => t.category === category).map(template => (
                    <div 
                      key={template.id}
                      onClick={() => createFromTemplate(template.id)} 
                      className="border border-zinc-200 rounded-xl p-5 cursor-pointer hover:border-zinc-400 hover:shadow-sm bg-white flex flex-col transition-all duration-200 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-50 rounded-bl-full -z-10 group-hover:bg-zinc-100 transition-colors"></div>
                      <div className="flex items-center justify-between mb-3">
                         {template.type === 'document' ? <FileText className="w-5 h-5 text-zinc-500" /> : <Database className="w-5 h-5 text-zinc-500" />}
                      </div>
                      <div className="font-semibold text-zinc-900 mt-2">{template.title}</div>
                      <div className="text-xs text-zinc-500 mt-1 flex-1 leading-relaxed">{template.description}</div>
                      <div className="mt-4 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 bg-zinc-100 self-start px-2 py-1 rounded">
                        {template.type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Database with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">What kind of tracker do you need?</label>
               <Input 
                 placeholder="e.g. A content calendar with status, publish date and writer"
                 value={aiPrompt}
                 onChange={(e) => setAiPrompt(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && createWithAI()}
               />
             </div>
             <Button className="w-full" disabled={!aiPrompt || isGenerating} onClick={createWithAI}>
               {isGenerating ? <><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Generating...</> : 'Generate'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
