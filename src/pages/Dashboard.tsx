import { Sparkles, FileText, Database, LayoutTemplate, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const createBlank = async (type: 'document' | 'database') => {
    if (!user) return;
    try {
      const p = await addDoc(collection(db, 'pages'), {
        title: 'Untitled',
        type,
        blocks: '[]',
        schema: type === 'database' ? JSON.stringify([
          { key: 'status', name: 'Status', type: 'status', options: ['To Do', 'In Progress', 'Done'] }
        ]) : '{}',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/${type === 'document' ? 'page' : 'database'}/${p.id}`);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <header className="mb-12">
          <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-4">
            Stremini Planner
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed">
            Your all-in-one workspace for documents, databases, and AI-powered task management. Start with a blank page or let AI design your workflow.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button 
            onClick={() => createBlank('document')}
            className="group flex flex-col p-6 bg-white border border-zinc-200 rounded-2xl hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">New Document</h3>
            <p className="text-sm text-zinc-500 mb-4 flex-1">Capture ideas, take notes, and draft content with AI assistance.</p>
            <div className="flex items-center text-xs font-medium text-purple-600 gap-1 group-hover:gap-2 transition-all">
              Create page <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button 
            onClick={() => createBlank('database')}
            className="group flex flex-col p-6 bg-white border border-zinc-200 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">New Database</h3>
            <p className="text-sm text-zinc-500 mb-4 flex-1">Build trackers, project boards, and structured task lists.</p>
            <div className="flex items-center text-xs font-medium text-blue-600 gap-1 group-hover:gap-2 transition-all">
              Create database <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-zinc-200">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-4 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              <span>AI Magic</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">Automate your workflow</h2>
            <p className="text-zinc-300 max-w-md text-sm leading-relaxed mb-6">
              Use the "Automate with AI" button in the sidebar to generate entire databases from a single prompt.
            </p>
            <button 
               onClick={() => document.getElementById('ai-trigger-sidebar')?.click()}
               className="bg-white text-zinc-900 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              Get Started
            </button>
          </div>
          
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-20%] right-[10%] w-48 h-48 bg-blue-500/20 rounded-full blur-[60px]"></div>
          <Sparkles className="absolute top-1/2 right-12 w-24 h-24 text-white/5 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
}
