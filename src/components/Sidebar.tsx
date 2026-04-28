import {
  Plus, FileText, Database, LogOut, ChevronDown, Sparkles,
  LayoutTemplate, Briefcase, List, Book, Layers, Loader2, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { logout, db } from '../lib/firebase';
import { Button } from './ui/button';
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { handleFirestoreError, OperationType } from '../lib/api';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { TEMPLATES } from '../lib/templates';
import { buildWorkspaceBlueprint } from '../lib/workspacePlanner';

const getCategoryIcon = (category: string) => {
  if (category.includes('Work'))      return <Briefcase className="w-4 h-4 text-zinc-400" />;
  if (category.includes('Education')) return <Book className="w-4 h-4 text-zinc-400" />;
  if (category.includes('Personal'))  return <List className="w-4 h-4 text-zinc-400" />;
  return <Layers className="w-4 h-4 text-zinc-400" />;
};

type GenStep = { label: string; done: boolean };

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genSteps, setGenSteps] = useState<GenStep[]>([]);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pages'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPages(data.sort((a: any, b: any) => b.createdAt - a.createdAt));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pages'));
    return () => unsub();
  }, [user]);

  const tickStep = (idx: number) =>
    setGenSteps(s => s.map((st, i) => i === idx ? { ...st, done: true } : st));

  const createBlank = async (type: 'document' | 'database') => {
    if (!user) return;
    const p = await addDoc(collection(db, 'pages'), {
      title: 'Untitled', type,
      blocks: '[]',
      schema: type === 'database'
        ? JSON.stringify([{ key: 'status', name: 'Status', type: 'status', options: ['To Do', 'In Progress', 'Done'] }])
        : '{}',
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    navigate(`/${type === 'document' ? 'page' : 'database'}/${p.id}`);
  };

  const createFromTemplate = async (templateId: string) => {
    if (!user) return;
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    const p = await addDoc(collection(db, 'pages'), {
      title: template.title, type: template.type,
      blocks: JSON.stringify(template.blocks || []),
      schema: JSON.stringify(template.schema || []),
      ownerId: user.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    if (template.type === 'database' && template.initialTasks?.length) {
      for (const task of template.initialTasks) {
        await addDoc(collection(db, 'records'), {
          title: task.title, databaseId: p.id,
          properties: JSON.stringify(task.properties || {}),
          blocks: '[]', ownerId: user.uid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
    }
    setIsTemplateDialogOpen(false);
    navigate(`/${template.type === 'document' ? 'page' : 'database'}/${p.id}`);
  };

  const createWithAI = async () => {
    if (!user || !aiPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenError('');
    setGenSteps([
      { label: 'Understanding your intent…', done: false },
      { label: 'Creating linked pages & databases…', done: false },
      { label: 'Populating tasks, reminders, and milestones…', done: false },
      { label: 'Saving workspace automation…', done: false },
    ]);

    try {
      const blueprint = buildWorkspaceBlueprint(aiPrompt);
      tickStep(0);

      const dashboardBlocks = [
        ...blueprint.dashboardBlocks,
        ...blueprint.proactiveSuggestions.map((suggestion) => ({
          id: uuidv4().slice(0, 8),
          type: 'quote',
          text: suggestion,
        })),
      ];

      const dashboardDoc = await addDoc(collection(db, 'pages'), {
        title: blueprint.title,
        type: 'document',
        blocks: JSON.stringify(dashboardBlocks),
        schema: '{}',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tickStep(1);

      let firstDatabaseId = '';
      for (const dbTemplate of blueprint.databases) {
        const dbDoc = await addDoc(collection(db, 'pages'), {
          title: dbTemplate.title,
          type: 'database',
          blocks: '[]',
          schema: JSON.stringify(dbTemplate.schema),
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (!firstDatabaseId) firstDatabaseId = dbDoc.id;

        for (const task of dbTemplate.records) {
          await addDoc(collection(db, 'records'), {
            title: task.title || 'Untitled',
            databaseId: dbDoc.id,
            properties: JSON.stringify(task.properties || {}),
            blocks: '[]', ownerId: user.uid,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          });
        }
      }

      const firstGoal = blueprint.databases[0]?.schema.find((col) => col.key === 'goal')?.options?.[0] || '';
      await addDoc(collection(db, 'records'), {
        title: 'Workspace hub',
        databaseId: firstDatabaseId,
        properties: JSON.stringify({
          category: 'Review',
          goal: firstGoal,
          priority: 'Medium',
          status: 'To Do',
          deadline: '',
          reminder_date: '',
          effort_hours: 1,
          linked_dashboard_id: dashboardDoc.id,
        }),
        blocks: '[]',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tickStep(2);
      tickStep(3);

      // Brief pause so user sees all steps complete
      await new Promise(r => setTimeout(r, 600));

      setIsAiDialogOpen(false);
      setAiPrompt('');
      setGenSteps([]);
      navigate(`/page/${dashboardDoc.id}`);
    } catch (e: any) {
      console.error(e);
      setGenError(e.message || 'AI generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-zinc-100 h-full flex flex-col pt-3 shadow-[1px_0_0_rgba(0,0,0,0.02)]">
      {/* Workspace header */}
      <div className="px-3 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full outline-none items-center gap-2 p-2 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-md text-xs text-white flex items-center justify-center font-bold shrink-0">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-zinc-800 truncate flex-1 text-left">
              {user?.email?.split('@')[0]}'s Workspace
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuItem className="text-sm cursor-pointer text-red-600 focus:text-red-600" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick create */}
      <div className="px-3 pb-3 space-y-0.5">
        <p className="px-2 text-[10px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Create</p>
        {[
          { label: 'New Document', icon: <FileText className="w-4 h-4" />, action: () => createBlank('document') },
          { label: 'New Database', icon: <Database className="w-4 h-4" />, action: () => createBlank('database') },
          { label: 'Templates', icon: <LayoutTemplate className="w-4 h-4" />, action: () => setIsTemplateDialogOpen(true) },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg transition-colors"
          >
            <span className="text-zinc-400">{item.icon}</span>
            {item.label}
          </button>
        ))}

        {/* AI button */}
        <button
          id="ai-trigger-sidebar"
          onClick={() => { setIsAiDialogOpen(true); setGenError(''); setGenSteps([]); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors mt-1"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          Automate with AI
        </button>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto mt-2 px-3">
        <p className="px-2 text-[10px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Workspace</p>
        <div className="space-y-0.5">
          {pages.length === 0 && (
            <p className="px-2 text-xs text-zinc-400 py-2">No pages yet.</p>
          )}
          {pages.map(p => (
            <NavLink
              key={p.id}
              to={`/${p.type === 'document' ? 'page' : 'database'}/${p.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg truncate transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`
              }
            >
              {p.type === 'document'
                ? <FileText className="w-4 h-4 shrink-0 text-zinc-400" />
                : <Database className="w-4 h-4 shrink-0 text-zinc-400" />
              }
              <span className="truncate">{p.title || 'Untitled'}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Templates Dialog ─────────────────────────────────────────── */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white border-zinc-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Choose a Template</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-8">
            {Array.from(new Set(TEMPLATES.map(t => t.category))).map(cat => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3 text-zinc-500">
                  {getCategoryIcon(cat)}
                  <h3 className="text-xs font-semibold uppercase tracking-widest">{cat}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {TEMPLATES.filter(t => t.category === cat).map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => createFromTemplate(tmpl.id)}
                      className="text-left border border-zinc-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md bg-white transition-all duration-150 group"
                    >
                      <div className="mb-2">
                        {tmpl.type === 'document'
                          ? <FileText className="w-5 h-5 text-zinc-500 group-hover:text-purple-500 transition-colors" />
                          : <Database className="w-5 h-5 text-zinc-500 group-hover:text-purple-500 transition-colors" />
                        }
                      </div>
                      <div className="font-semibold text-zinc-900 text-sm">{tmpl.title}</div>
                      <div className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{tmpl.description}</div>
                      <div className="mt-3 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 bg-zinc-100 self-start px-2 py-0.5 rounded-full inline-block">
                        {tmpl.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI Generation Dialog ─────────────────────────────────────── */}
      <Dialog open={isAiDialogOpen} onOpenChange={(o) => { if (!isGenerating) setIsAiDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Generate Database with AI
            </DialogTitle>
          </DialogHeader>

          {!isGenerating && genSteps.length === 0 ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">What kind of tracker do you need?</label>
                <Input
                  placeholder="e.g. Content calendar with status, publish date and author"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createWithAI()}
                  autoFocus
                />
                <p className="text-xs text-zinc-400">Be descriptive for better results.</p>
              </div>
              {genError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {genError}
                </div>
              )}
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={!aiPrompt.trim()} onClick={createWithAI}>
                <Sparkles className="w-4 h-4 mr-2" /> Generate
              </Button>
            </div>
          ) : (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-zinc-800">Building your database…</p>
                <p className="text-xs text-zinc-400 text-center">"{aiPrompt}"</p>
              </div>
              <div className="space-y-3">
                {genSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${step.done ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                      {step.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        : <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                      }
                    </div>
                    <span className={`text-sm transition-colors ${step.done ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {genError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                  {genError}
                  <button
                    className="block mt-2 text-xs underline text-red-500"
                    onClick={() => { setGenSteps([]); setGenError(''); setIsGenerating(false); }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  );
}
