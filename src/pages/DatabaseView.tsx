import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Plus, MoreHorizontal, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function DatabaseView() {
  const { pageId } = useParams();
  const { user } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [schema, setSchema] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  
  const [isColDialogOpen, setIsColDialogOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [newColOptions, setNewColOptions] = useState('');

  useEffect(() => {
    if (!pageId || !user) return;
    const unsubPage = onSnapshot(doc(db, 'pages', pageId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPage({ id: docSnap.id, ...data });
        try {
          const parsed = JSON.parse(data.schema || '[]');
          setSchema(Array.isArray(parsed) ? parsed : []);
        } catch(e) {
          setSchema([]);
        }
      }
    });

    const q = query(collection(db, 'records'), where('databaseId', '==', pageId), where('ownerId', '==', user.uid));
    const unsubRecords = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data.sort((a:any, b:any) => b.createdAt - a.createdAt));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `records`));

    return () => {
      unsubPage();
      unsubRecords();
    };
  }, [pageId, user]);

  const updateTitle = async (newTitle: string) => {
    if (!pageId) return;
    setPage({...page, title: newTitle});
    await updateDoc(doc(db, 'pages', pageId), { title: newTitle, updatedAt: serverTimestamp() });
  };

  const addRecord = async () => {
    if (!user || !pageId) return;
    try {
      const initProps: any = {};
      schema.forEach(col => {
         initProps[col.key] = col.type === 'select' || col.type === 'status' ? (col.options?.[0] || '') : '';
      });
      await addDoc(collection(db, 'records'), {
        databaseId: pageId,
        title: '',
        properties: JSON.stringify(initProps),
        blocks: '[]',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch(e) {
      console.error(e);
    }
  };

  const updateRecordTitle = async (recordId: string, title: string) => {
    await updateDoc(doc(db, 'records', recordId), { title, updatedAt: serverTimestamp() });
  };

  const updateRecordProp = async (recordId: string, currentPropsRaw: string, key: string, value: string) => {
    try {
      const props = JSON.parse(currentPropsRaw || '{}');
      props[key] = value;
      await updateDoc(doc(db, 'records', recordId), { properties: JSON.stringify(props), updatedAt: serverTimestamp() });
    } catch(e) {
      console.error(e);
    }
  };

  const addColumn = async () => {
    if (!pageId || !newColName) return;
    const newSchema = [...schema, {
      key: newColName.toLowerCase().replace(/\s+/g, ''),
      name: newColName,
      type: newColType,
      options: newColType === 'select' || newColType === 'status' ? newColOptions.split(',').map(o => o.trim()).filter(Boolean) : []
    }];
    try {
      await updateDoc(doc(db, 'pages', pageId), { schema: JSON.stringify(newSchema), updatedAt: serverTimestamp() });
      setIsColDialogOpen(false);
      setNewColName('');
      setNewColOptions('');
    } catch (e: any) {
      console.error(e);
      alert('Failed: ' + e.message);
    }
  };

  if (!page) return null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col mb-12">
      {/* Header/Breadcrumbs */}
      <header className="h-12 w-full flex-shrink-0 flex items-center justify-between px-6 border-b border-[#EDECE9] bg-white">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-[#37352F] font-medium">{page.title || 'Untitled'}</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-xs text-zinc-500 hover:bg-zinc-100 px-3 py-1.5 rounded-md">Updates</button>
        </div>
      </header>

      <div className="p-12 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto w-full">
        <div className="mt-4 mb-4">
          {/* database emoji icon removed for a sleek clean design */}
        </div>
        
        <input 
          className="w-full text-5xl font-bold tracking-tight text-zinc-900 mb-10 bg-transparent outline-none placeholder-zinc-300"
          placeholder="Untitled Database"
          value={page.title || ''}
          onChange={e => updateTitle(e.target.value)}
        />

        <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-2">
          <div className="flex items-center space-x-4 text-sm font-medium">
            <button className="border-b-2 border-zinc-900 pb-2 text-zinc-900">Table</button>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setIsColDialogOpen(true)} className="text-xs font-medium text-zinc-700 bg-white border border-zinc-200 px-3 py-1.5 rounded-md hover:bg-zinc-50 flex items-center transition-colors">
              <Settings2 className="w-3 h-3 mr-1.5" /> Add Column
            </button>
            <button onClick={addRecord} className="text-xs font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors flex items-center">
              <Plus className="w-3 h-3 mr-1" /> New Record
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto text-sm border border-zinc-200 rounded-lg bg-white shadow-sm">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 text-xs font-medium uppercase tracking-wider">
                <th className="py-2.5 px-4 w-64 min-w-[200px] border-r border-zinc-100">Primary Field</th>
                {schema.map(col => (
                  <th key={col.key} className="py-2.5 px-4 min-w-[150px] border-r border-zinc-100 last:border-0">{col.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {records.map(record => {
                let props: any = {};
                try { props = JSON.parse(record.properties || '{}'); } catch(e) {}
                
                return (
                  <tr key={record.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="py-2 px-4 font-medium text-zinc-900 border-r border-zinc-100">
                       <input 
                         className="w-full bg-transparent outline-none placeholder-zinc-300 focus:bg-white focus:ring-2 ring-zinc-200 rounded px-2 py-1 -ml-2 transition-all" 
                         value={record.title}
                         placeholder="Empty"
                         onChange={e => {
                           const newRecords = [...records];
                           const idx = newRecords.findIndex(r => r.id === record.id);
                           newRecords[idx].title = e.target.value;
                           setRecords(newRecords);
                         }}
                         onBlur={e => updateRecordTitle(record.id, e.target.value)}
                       />
                    </td>
                    {schema.map(col => (
                      <td key={col.key} className="py-2 px-4 border-r border-zinc-100 last:border-0">
                        {col.type === 'select' || col.type === 'status' ? (
                           <div className="relative">
                             <select 
                               className="appearance-none w-full bg-transparent outline-none cursor-pointer hover:bg-zinc-100/80 rounded px-2 py-1 -ml-2 transition-colors text-zinc-700"
                               value={props[col.key] || ''}
                               onChange={e => updateRecordProp(record.id, record.properties, col.key, e.target.value)}
                             >
                               <option value="">Empty</option>
                               {col.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                           </div>
                        ) : col.type === 'date' ? (
                          <input 
                            type="date"
                            className="w-full text-zinc-700 bg-transparent outline-none cursor-pointer hover:bg-zinc-100/80 px-2 py-1 -ml-2 rounded transition-colors"
                            value={props[col.key] || ''}
                            onChange={e => updateRecordProp(record.id, record.properties, col.key, e.target.value)}
                          />
                        ) : col.type === 'checkbox' ? (
                          <div className="flex items-center h-full pt-1 px-2">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 accent-purple-600 cursor-pointer transition-colors"
                              checked={props[col.key] === 'true' || props[col.key] === true}
                              onChange={e => updateRecordProp(record.id, record.properties, col.key, String(e.target.checked))}
                            />
                          </div>
                        ) : col.type === 'number' ? (
                          <input 
                            type="number"
                            className="w-full text-zinc-700 bg-transparent outline-none focus:bg-white focus:ring-2 ring-zinc-200 rounded px-2 py-1 -ml-2 placeholder-zinc-300 transition-all"
                            value={props[col.key] || ''}
                            onBlur={e => updateRecordProp(record.id, record.properties, col.key, e.target.value)}
                            onChange={(e) => {
                              const newRecords = [...records];
                               const idx = newRecords.findIndex(r => r.id === record.id);
                               try {
                                 const p = JSON.parse(newRecords[idx].properties || '{}');
                                 p[col.key] = e.target.value;
                                 newRecords[idx].properties = JSON.stringify(p);
                                 setRecords(newRecords);
                               } catch(er) {}
                            }}
                          />
                        ) : (
                          <input 
                            className="w-full text-zinc-700 bg-transparent outline-none focus:bg-white focus:ring-2 ring-zinc-200 rounded px-2 py-1 -ml-2 placeholder-zinc-300 transition-all"
                            placeholder="Empty"
                            value={props[col.key] || ''}
                            onChange={(e) => {
                              // Optimistic UI update could go here
                              const newRecords = [...records];
                               const idx = newRecords.findIndex(r => r.id === record.id);
                               try {
                                 const p = JSON.parse(newRecords[idx].properties || '{}');
                                 p[col.key] = e.target.value;
                                 newRecords[idx].properties = JSON.stringify(p);
                                 setRecords(newRecords);
                               } catch(er) {}
                            }}
                            onBlur={e => updateRecordProp(record.id, record.properties, col.key, e.target.value)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      <Dialog open={isColDialogOpen} onOpenChange={setIsColDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="e.g. Priority" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Type</label>
              <Select value={newColType} onValueChange={setNewColType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="select">Select / Status</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newColType === 'select' || newColType === 'status') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Options (comma separated)</label>
                <Input value={newColOptions} onChange={e => setNewColOptions(e.target.value)} placeholder="e.g. High, Medium, Low" />
              </div>
            )}
            <Button className="w-full" onClick={addColumn} disabled={!newColName}>Add Column</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
