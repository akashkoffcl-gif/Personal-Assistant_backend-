'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { format } from 'date-fns';
import {
  BookOpen,
  Folder,
  Plus,
  Search,
  Pin,
  Bookmark,
  Tag,
  FileText,
  Lightbulb,
  BookMarked,
  GraduationCap,
  Sparkles,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  FolderPlus,
  Archive,
  Star,
  CheckCircle2,
  History,
  RotateCcw,
  UploadCloud,
  RefreshCw,
  Paperclip,
  Network,
  BrainCircuit,
  HelpCircle,
  Check,
  X,
  ArrowRight,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  Eye,
  CheckSquare,
  Compass,
} from 'lucide-react';

// ==================== MARKDOWN RENDERER COMPONENT ====================
function SimpleMarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return <p className="text-xs text-[#74738A] italic">No content to display.</p>;
  }

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed text-[#202033]">
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={index} className="text-xs font-bold text-[#202033] pt-2">
              {line.replace('### ', '')}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={index} className="text-sm font-bold text-[#202033] pt-2 border-b border-[#E5E2F5] pb-1">
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={index} className="text-base font-extrabold text-[#8B45F5] pt-2">
              {line.replace('# ', '')}
            </h2>
          );
        }
        // Blockquotes
        if (line.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className="border-l-4 border-[#8B45F5] pl-3 py-1 bg-[#F4F3FF] text-[#6935C8] rounded-r-lg italic"
            >
              {line.replace('> ', '')}
            </blockquote>
          );
        }
        // Checkboxes
        if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) {
          return (
            <div key={index} className="flex items-center gap-2 pl-2 text-[#74738A]">
              <div className="w-3.5 h-3.5 rounded border border-[#74738A] flex items-center justify-center shrink-0" />
              <span>{line.replace(/^[-*] \[ \] /, '')}</span>
            </div>
          );
        }
        if (line.startsWith('- [x] ') || line.startsWith('* [x] ')) {
          return (
            <div key={index} className="flex items-center gap-2 pl-2 text-[#10B981] line-through">
              <div className="w-3.5 h-3.5 rounded bg-[#10B981] text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>{line.replace(/^[-*] \[x\] /, '')}</span>
            </div>
          );
        }
        // Bullet lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="text-[#8B45F5] font-black text-sm leading-none">•</span>
              <span>{line.replace(/^[-*] /, '')}</span>
            </div>
          );
        }
        // Horizontal Rule
        if (line.trim() === '---' || line.trim() === '***') {
          return <hr key={index} className="border-t border-[#E5E2F5] my-2" />;
        }
        // Empty lines
        if (line.trim() === '') {
          return <div key={index} className="h-1" />;
        }
        // Standard paragraph
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

// ==================== WORKSPACE MAIN COMPONENT ====================
export const KnowledgeWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Navigation views: 10 views
  type KnowledgeView =
    | 'overview'
    | 'notes'
    | 'journal'
    | 'capture'
    | 'documents'
    | 'bookmarks'
    | 'folders'
    | 'tags'
    | 'graph'
    | 'ai-search';

  const [activeView, setActiveView] = useState<KnowledgeView>('overview');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  // Journal specific date
  const [journalDate, setJournalDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Modals & Panels state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);

  // Note Modal Sub-tabs ('edit' | 'preview' | 'ai' | 'history')
  const [modalTab, setModalTab] = useState<'edit' | 'preview' | 'ai' | 'history'>('edit');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [isExtractingActions, setIsExtractingActions] = useState(false);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isExtractingTopics, setIsExtractingTopics] = useState(false);

  // Quick Capture State
  const [quickCaptureText, setQuickCaptureText] = useState('');
  const [quickCaptureCategory, setQuickCaptureCategory] = useState('NOTE');

  // AI Search & Grounded Ask State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswerResult, setAiAnswerResult] = useState<any>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');

  // ==================== QUERIES ====================
  const { data: summaryData } = useQuery({
    queryKey: ['knowledge-summary'],
    queryFn: () => api.getKnowledgeSummary(),
  });
  const summaryRaw = (summaryData as any)?.data || summaryData;
  const summary = {
    totalNotes: summaryRaw?.totalNotes || 0,
    pinnedNotes: summaryRaw?.pinnedNotes || 0,
    totalFolders: summaryRaw?.totalFolders || 0,
    totalBookmarks: summaryRaw?.totalBookmarks || 0,
    tags: Array.isArray(summaryRaw?.tags) ? summaryRaw.tags : [],
    recentNotes: Array.isArray(summaryRaw?.recentNotes) ? summaryRaw.recentNotes : [],
  };

  const { data: foldersData } = useQuery({
    queryKey: ['knowledge-folders'],
    queryFn: () => api.getFolders(),
  });
  const folders = Array.isArray(foldersData)
    ? foldersData
    : Array.isArray((foldersData as any)?.data)
    ? (foldersData as any).data
    : [];

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: [
      'knowledge-notes',
      selectedFolderId,
      activeCategory,
      selectedTag,
      searchQuery,
      showTrash,
      activeView === 'journal' ? journalDate : undefined,
    ],
    queryFn: () =>
      api.getNotes({
        folderId: selectedFolderId || undefined,
        category:
          activeCategory !== 'ALL' && activeCategory !== 'PINNED'
            ? (activeCategory as any)
            : undefined,
        isPinned: activeCategory === 'PINNED' ? true : undefined,
        tag: selectedTag || undefined,
        search: searchQuery || undefined,
        isTrash: showTrash,
        isJournal: activeView === 'journal' ? true : undefined,
        journalDate: activeView === 'journal' ? journalDate : undefined,
      }),
  });
  const notes = Array.isArray(notesData)
    ? notesData
    : Array.isArray((notesData as any)?.data)
    ? (notesData as any).data
    : [];

  const { data: bookmarksData } = useQuery({
    queryKey: ['knowledge-bookmarks'],
    queryFn: () => api.getBookmarks(),
    enabled: activeView === 'bookmarks' || activeView === 'overview',
  });
  const bookmarks = Array.isArray(bookmarksData)
    ? bookmarksData
    : Array.isArray((bookmarksData as any)?.data)
    ? (bookmarksData as any).data
    : [];

  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => api.getDocuments(),
    enabled: activeView === 'documents' || activeView === 'overview',
  });
  const documents = Array.isArray(documentsData)
    ? documentsData
    : Array.isArray((documentsData as any)?.data)
    ? (documentsData as any).data
    : [];

  const { data: graphData } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => api.getKnowledgeGraph(),
    enabled: activeView === 'graph' || isRelationModalOpen,
  });
  const graphRaw = (graphData as any)?.data || graphData || { nodes: [], edges: [], links: [] };
  const graph = {
    nodes: Array.isArray(graphRaw.nodes) ? graphRaw.nodes : [],
    edges: Array.isArray(graphRaw.edges)
      ? graphRaw.edges
      : Array.isArray(graphRaw.links)
      ? graphRaw.links
      : [],
  };

  // ==================== MUTATIONS ====================
  const createNoteMutation = useMutation({
    mutationFn: (data: any) => api.createNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] });
      toast.success('Note Created', 'Knowledge asset saved to database.');
      setIsNoteModalOpen(false);
      setEditingNote(null);
    },
    onError: (err: any) => toast.error('Creation failed', err?.message),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.success('Note Updated', 'Version snapshot and changes saved.');
      setEditingNote(null);
    },
    onError: (err: any) => toast.error('Update failed', err?.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] });
      toast.info('Note Moved to Trash', 'You can restore it anytime.');
    },
  });

  const restoreNoteMutation = useMutation({
    mutationFn: (id: string) => api.restoreNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.success('Note Restored', 'Asset recovered from trash.');
    },
  });

  const purgeNoteMutation = useMutation({
    mutationFn: (id: string) => api.purgeNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.error('Note Purged', 'Permanently deleted.');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.rollbackNoteVersion(id, version),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      setEditingNote(data);
      toast.success('Version Rolled Back', `Restored to version ${data.versions?.length || 1}`);
    },
    onError: (err: any) => toast.error('Rollback failed', err?.message),
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      api.updateNote(id, { isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: any) => api.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.success('Folder Created');
      setIsFolderModalOpen(false);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => api.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      if (selectedFolderId) setSelectedFolderId(null);
      toast.info('Folder Deleted');
    },
  });

  const createBookmarkMutation = useMutation({
    mutationFn: (data: any) => api.createBookmark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.success('Bookmark Saved');
      setIsBookmarkModalOpen(false);
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: (id: string) => api.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.info('Bookmark Removed');
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data: any) => api.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-summary'] });
      toast.success('Document Indexed', 'File chunked and vectorized.');
      setIsDocumentModalOpen(false);
    },
    onError: (err: any) => toast.error('Upload failed', err?.message),
  });

  const reindexDocumentMutation = useMutation({
    mutationFn: (id: string) => api.reindexDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      toast.success('Re-indexing Complete', 'Embeddings refreshed.');
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      toast.info('Document Removed');
    },
  });

  const createRelationMutation = useMutation({
    mutationFn: (data: any) => api.createKnowledgeRelation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-graph'] });
      toast.success('Relation Created', 'Knowledge graph connection stored.');
      setIsRelationModalOpen(false);
    },
  });

  const convertToTaskMutation = useMutation({
    mutationFn: (title: string) =>
      api.createTask({
        title,
        priority: 'MEDIUM',
        status: 'PENDING',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task Created', 'Added to Tasks workspace.');
    },
  });

  // ==================== AI TOOL HANDLERS ====================
  const handleAskKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setIsAskingAi(true);
    setAiAnswerResult(null);
    try {
      const res = await api.askKnowledge(aiQuestion);
      setAiAnswerResult(res);
    } catch (err: any) {
      toast.error('AI Query Failed', err?.message);
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCaptureText.trim()) return;

    // AI title suggestion in background
    let title = 'Quick Note ' + format(new Date(), 'MMM d, h:mm a');
    try {
      const suggested = await api.suggestTitle(quickCaptureText);
      if (suggested?.title) title = suggested.title;
    } catch (err) {
      // fallback to default
    }

    createNoteMutation.mutate({
      title,
      content: quickCaptureText,
      category: quickCaptureCategory,
      tags: ['quick-capture'],
    });
    setQuickCaptureText('');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & WORKSPACE CONTROL BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
              Phase 42 • Knowledge Intelligence Foundation
            </span>
            <span className="text-xs text-[#74738A] font-semibold">Autonomous Second Brain</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#202033] tracking-tight">
            Knowledge Intelligence Workspace
          </h2>
          <p className="text-xs text-[#74738A] mt-0.5">
            Unified Second Brain: Notes, Journal, Attachments, Semantic AI Search & Relational Graph.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#74738A]" />
            <input
              type="text"
              placeholder="Search assets, tags, text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
            />
          </div>

          <button
            onClick={() => {
              setEditingNote(null);
              setModalTab('edit');
              setIsNoteModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>

          <button
            onClick={() => setIsDocumentModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-[#8B45F5] bg-[#F4F3FF] hover:bg-[#EAE9FF] border border-[#E5E2F5] rounded-xl transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Add File</span>
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION BAR: 10 VIEWS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#E5E2F5] pt-1">
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'notes', label: 'All Notes', icon: FileText, count: summary.totalNotes },
          { id: 'journal', label: 'Daily Journal', icon: BookMarked },
          { id: 'capture', label: 'Quick Capture', icon: Sparkles },
          { id: 'documents', label: 'Documents', icon: Paperclip, count: documents.length },
          { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, count: summary.totalBookmarks },
          { id: 'folders', label: 'Folders', icon: Folder, count: folders.length },
          { id: 'tags', label: 'Tag Cloud', icon: Tag, count: summary.tags?.length || 0 },
          { id: 'graph', label: 'Knowledge Graph', icon: Network },
          { id: 'ai-search', label: 'AI Search & Ask', icon: BrainCircuit },
        ].map((v) => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => {
                setActiveView(v.id as KnowledgeView);
                if (v.id === 'journal') setActiveCategory('JOURNAL');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#8B45F5] text-white shadow-2xs font-extrabold'
                  : 'text-[#74738A] hover:bg-[#F4F3FF] hover:text-[#202033]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{v.label}</span>
              {v.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F4F3FF] text-[#6935C8]'
                  }`}
                >
                  {v.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================== VIEW 1: OVERVIEW ==================== */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* KPI Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
                  Total Notes
                </span>
                <span className="text-xl font-black text-[#202033]">{summary.totalNotes}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center shrink-0">
                <Pin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
                  Pinned Notes
                </span>
                <span className="text-xl font-black text-[#202033]">{summary.pinnedNotes}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAFBF1] text-[#10B981] flex items-center justify-center shrink-0">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
                  Indexed Docs
                </span>
                <span className="text-xl font-black text-[#202033]">{documents.length}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center shrink-0">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
                  Graph Edges
                </span>
                <span className="text-xl font-black text-[#202033]">{graph.edges?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Jump & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Notes */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#202033] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8B45F5]" />
                  <span>Recently Updated Knowledge</span>
                </h3>
                <button
                  onClick={() => setActiveView('notes')}
                  className="text-xs text-[#8B45F5] font-bold hover:underline"
                >
                  View All Notes
                </button>
              </div>

              {notes.slice(0, 4).length === 0 ? (
                <div className="py-8 text-center text-xs text-[#74738A]">No notes created yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notes.slice(0, 4).map((note: any) => (
                    <div
                      key={note.id}
                      onClick={() => {
                        setEditingNote(note);
                        setModalTab('preview');
                        setIsNoteModalOpen(true);
                      }}
                      className="p-4 rounded-xl border border-[#E5E2F5] hover:border-[#8B45F5] transition-all cursor-pointer bg-white group hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#74738A] mb-1.5">
                        <span className="font-extrabold uppercase px-2 py-0.5 rounded bg-[#F4F3FF] text-[#8B45F5]">
                          {note.category}
                        </span>
                        <span>{format(new Date(note.updatedAt), 'MMM d')}</span>
                      </div>
                      <h4 className="font-bold text-xs text-[#202033] group-hover:text-[#8B45F5] truncate">
                        {note.title}
                      </h4>
                      <p className="text-[11px] text-[#74738A] line-clamp-2 mt-1">
                        {note.summary || note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & AI Search Prompt */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#202033] flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-[#8B45F5]" />
                <span>Second Brain AI Assistant</span>
              </h3>
              <p className="text-xs text-[#74738A]">
                Ask questions across all notes, uploaded documents, and web links with source citations.
              </p>
              <form onSubmit={handleAskKnowledge} className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. What did I plan for Redis?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E2F5] rounded-xl focus:outline-none focus:border-[#8B45F5]"
                />
                <button
                  type="submit"
                  disabled={isAskingAi}
                  onClick={() => setActiveView('ai-search')}
                  className="w-full py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Knowledge Base</span>
                </button>
              </form>

              <hr className="border-t border-[#E5E2F5]" />

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block">
                  Quick Links
                </span>
                <button
                  onClick={() => setActiveView('capture')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[#F4F3FF] text-[#202033]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B45F5]" /> Quick Capture Scratchpad
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#74738A]" />
                </button>
                <button
                  onClick={() => setActiveView('graph')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[#F4F3FF] text-[#202033]"
                >
                  <span className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 text-[#8B45F5]" /> Relational Graph Explorer
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#74738A]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: ALL NOTES ==================== */}
      {activeView === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Navigation Sidebar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#74738A]">
                  Categories
                </span>
                <button
                  onClick={() => setShowTrash(!showTrash)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    showTrash
                      ? 'bg-[#FFEAEF] text-[#E05268]'
                      : 'bg-[#F4F3FF] text-[#74738A] hover:text-[#202033]'
                  }`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>{showTrash ? 'Viewing Trash' : 'Trash'}</span>
                </button>
              </div>

              <div className="space-y-1 text-xs font-semibold">
                {[
                  { id: 'ALL', label: 'All Knowledge', icon: BookOpen },
                  { id: 'PINNED', label: 'Pinned Only', icon: Pin },
                  { id: 'NOTE', label: 'Standard Notes', icon: FileText },
                  { id: 'JOURNAL', label: 'Daily Journal', icon: BookMarked },
                  { id: 'IDEA', label: 'Ideas & Innovation', icon: Lightbulb },
                  { id: 'LEARNING', label: 'Learning & Skills', icon: GraduationCap },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = activeCategory === cat.id && !showTrash;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setSelectedFolderId(null);
                        setShowTrash(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#8B45F5] text-white shadow-2xs font-bold'
                          : 'text-[#202033] hover:bg-[#F4F3FF]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{cat.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Folders List */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#74738A]">
                  Folders ({folders.length})
                </span>
                <button
                  onClick={() => setIsFolderModalOpen(true)}
                  className="text-[11px] font-bold text-[#8B45F5] hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-1 text-xs">
                {folders.map((folder: any) => {
                  const isSelected = selectedFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setSelectedFolderId(isSelected ? null : folder.id);
                        setActiveCategory('ALL');
                        setShowTrash(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-[#F4F3FF] text-[#8B45F5] font-bold border border-[#E5E2F5]'
                          : 'text-[#202033] hover:bg-[#F4F3FF]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color || '#8B45F5' }} />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <span className="text-[10px] text-[#74738A]">{folder._count?.notes || 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Notes Grid */}
          <div className="lg:col-span-3 space-y-4">
            {notesLoading ? (
              <div className="p-12 text-center text-xs text-[#74738A] bg-white rounded-2xl border border-[#E5E2F5]">
                Loading knowledge assets...
              </div>
            ) : notes.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#E5E2F5] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#202033]">
                  {showTrash ? 'Trash Bin is Empty' : 'No Notes Found'}
                </h3>
                <p className="text-xs text-[#74738A] max-w-sm mx-auto">
                  {showTrash
                    ? 'Soft-deleted notes will appear here where they can be restored or purged.'
                    : 'Document research, meeting discussions, flash ideas, or coding references.'}
                </p>
                {!showTrash && (
                  <button
                    onClick={() => {
                      setEditingNote(null);
                      setModalTab('edit');
                      setIsNoteModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Write Note</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note: any) => (
                  <div
                    key={note.id}
                    className="bg-white rounded-2xl border border-[#E5E2F5] shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#8B45F5] border border-[#E5E2F5]">
                            {note.category}
                          </span>
                          {note.folder && (
                            <span className="text-[10px] font-semibold text-[#74738A] flex items-center gap-1">
                              <Folder className="w-3 h-3 text-[#8B45F5]" />
                              {note.folder.name}
                            </span>
                          )}
                        </div>

                        {showTrash ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => restoreNoteMutation.mutate(note.id)}
                              className="p-1.5 text-[#10B981] hover:bg-[#EAFBF1] rounded-lg text-xs font-bold flex items-center gap-1"
                              title="Restore note"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Permanently purge '${note.title}'? This cannot be undone.`)) {
                                  purgeNoteMutation.mutate(note.id);
                                }
                              }}
                              className="p-1.5 text-[#E05268] hover:bg-[#FFEAEF] rounded-lg text-xs font-bold"
                              title="Purge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                togglePinMutation.mutate({ id: note.id, isPinned: !note.isPinned })
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                note.isPinned
                                  ? 'text-[#F59E0B] bg-[#FFFBEB]'
                                  : 'text-[#74738A] hover:text-[#F59E0B] hover:bg-[#FFFBEB]'
                              }`}
                              title={note.isPinned ? 'Unpin' : 'Pin note'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setModalTab('edit');
                                setIsNoteModalOpen(true);
                              }}
                              className="p-1.5 text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Move '${note.title}' to trash?`)) {
                                  deleteNoteMutation.mutate(note.id);
                                }
                              }}
                              className="p-1.5 text-[#74738A] hover:text-[#E05268] hover:bg-[#FFEAEF] rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h3
                        onClick={() => {
                          setEditingNote(note);
                          setModalTab('preview');
                          setIsNoteModalOpen(true);
                        }}
                        className="text-base font-bold text-[#202033] tracking-tight group-hover:text-[#8B45F5] transition-colors cursor-pointer"
                      >
                        {note.title}
                      </h3>

                      <p className="text-xs text-[#74738A] mt-2 whitespace-pre-line line-clamp-4 leading-relaxed font-normal">
                        {note.content}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-between text-[11px] text-[#74738A]">
                      <div className="flex items-center gap-1 flex-wrap">
                        {note.tags &&
                          note.tags.map((item: any) => (
                            <span
                              key={item.tag?.id || item}
                              className="px-2 py-0.5 rounded-md bg-[#F4F3FF] text-[#6935C8] font-semibold text-[10px]"
                            >
                              #{item.tag?.name || item}
                            </span>
                          ))}
                      </div>
                      <span className="shrink-0">{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 3: DAILY JOURNAL ==================== */}
      {activeView === 'journal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#202033] flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-[#8B45F5]" />
                <span>Daily Reflection & Executive Journal</span>
              </h3>
              <p className="text-xs text-[#74738A] mt-0.5">
                Capture daily achievements, blockages, emotional energy, and strategic takeaways.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#74738A]" />
              <input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-[#E5E2F5] rounded-xl text-[#202033]"
              />
              <button
                onClick={() => {
                  setEditingNote({
                    title: `Executive Journal — ${format(new Date(journalDate), 'EEEE, MMMM d, yyyy')}`,
                    content: `### 🌅 Morning Intention\n- Top Priority:\n- Mindset:\n\n### ⚡ Midday Reflection\n- Wins:\n- Challenges:\n\n### 🌙 Evening Debrief\n- Gratitude:\n- Tomorrow's Focus:\n`,
                    category: 'JOURNAL',
                    isJournal: true,
                    journalDate: journalDate,
                    tags: ['journal', 'daily-reflection'],
                  });
                  setModalTab('edit');
                  setIsNoteModalOpen(true);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Journal for Date</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.filter((n: any) => n.category === 'JOURNAL' || n.isJournal).length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-white rounded-2xl border border-dashed border-[#E5E2F5] space-y-3">
                <BookMarked className="w-8 h-8 text-[#8B45F5] mx-auto" />
                <h4 className="text-sm font-bold text-[#202033]">No Journal Entry for this Date</h4>
                <p className="text-xs text-[#74738A]">
                  Reflect on your achievements and lessons learned today.
                </p>
              </div>
            ) : (
              notes
                .filter((n: any) => n.category === 'JOURNAL' || n.isJournal)
                .map((j: any) => (
                  <div
                    key={j.id}
                    onClick={() => {
                      setEditingNote(j);
                      setModalTab('preview');
                      setIsNoteModalOpen(true);
                    }}
                    className="p-5 bg-white rounded-2xl border border-[#E5E2F5] hover:border-[#8B45F5] transition-all cursor-pointer shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#F4F3FF] text-[#8B45F5]">
                        {j.journalDate || format(new Date(j.createdAt), 'yyyy-MM-dd')}
                      </span>
                      <span className="text-xs text-[#74738A]">{format(new Date(j.createdAt), 'h:mm a')}</span>
                    </div>
                    <h4 className="font-bold text-sm text-[#202033]">{j.title}</h4>
                    <p className="text-xs text-[#74738A] line-clamp-4 whitespace-pre-line">{j.content}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 4: QUICK CAPTURE ==================== */}
      {activeView === 'capture' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-[#E5E2F5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#202033] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#8B45F5]" />
              <span>Quick Capture Scratchpad</span>
            </h3>
            <span className="text-xs text-[#74738A]">AI Auto-Title & Topic Extraction</span>
          </div>

          <p className="text-xs text-[#74738A]">
            Jot down rapid thoughts, meeting highlights, links, or draft ideas. The Second Brain AI will
            automatically summarize, title, and categorize your note on save.
          </p>

          <form onSubmit={handleQuickCapture} className="space-y-4">
            <textarea
              rows={8}
              value={quickCaptureText}
              onChange={(e) => setQuickCaptureText(e.target.value)}
              placeholder="Dump raw thoughts here... e.g., 'Met with Sarah to discuss database sharding. We decided to benchmark Supabase read-replicas by Friday.'"
              className="w-full p-4 border border-[#E5E2F5] rounded-xl text-xs text-[#202033] focus:outline-none focus:border-[#8B45F5] leading-relaxed"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#74738A]">Category:</span>
                <select
                  value={quickCaptureCategory}
                  onChange={(e) => setQuickCaptureCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-[#E5E2F5] rounded-lg text-[#202033]"
                >
                  <option value="NOTE">Standard Note</option>
                  <option value="IDEA">Idea & Vision</option>
                  <option value="LEARNING">Learning</option>
                  <option value="JOURNAL">Journal</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!quickCaptureText.trim() || createNoteMutation.isPending}
                className="px-5 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save with AI Assistant</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== VIEW 5: DOCUMENTS & ATTACHMENTS ==================== */}
      {activeView === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#202033] flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-[#8B45F5]" />
                <span>Document & Knowledge Attachments Hub</span>
              </h3>
              <p className="text-xs text-[#74738A] mt-0.5">
                Upload Markdown, TXT, and PDF documentation with automated chunking and semantic vector indexing.
              </p>
            </div>

            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Index Document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.length === 0 ? (
              <div className="col-span-3 p-12 text-center bg-white rounded-2xl border border-dashed border-[#E5E2F5] space-y-3">
                <Paperclip className="w-8 h-8 text-[#8B45F5] mx-auto" />
                <h4 className="text-sm font-bold text-[#202033]">No Documents Uploaded</h4>
                <p className="text-xs text-[#74738A]">
                  Attach system architecture specs, company policies, or code readmes.
                </p>
              </div>
            ) : (
              documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          doc.indexingStatus === 'INDEXED'
                            ? 'bg-[#EAFBF1] text-[#10B981]'
                            : doc.indexingStatus === 'PROCESSING'
                            ? 'bg-[#FFFBEB] text-[#F59E0B]'
                            : 'bg-[#FFEAEF] text-[#E05268]'
                        }`}
                      >
                        {doc.indexingStatus}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => reindexDocumentMutation.mutate(doc.id)}
                          className="p-1 text-[#74738A] hover:text-[#8B45F5] rounded"
                          title="Re-index document"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete document '${doc.fileName}'?`)) {
                              deleteDocumentMutation.mutate(doc.id);
                            }
                          }}
                          className="p-1 text-[#74738A] hover:text-[#E05268] rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-[#202033] truncate">{doc.fileName}</h4>
                    <p className="text-xs text-[#74738A] mt-1 line-clamp-3">
                      {doc.extractedText || 'No text extracted.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-between text-[11px] text-[#74738A]">
                    <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    <span className="font-semibold text-[#8B45F5]">
                      {doc.chunks?.length || doc._count?.chunks || 0} chunks indexed
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 6: BOOKMARKS ==================== */}
      {activeView === 'bookmarks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[#E5E2F5]">
            <h3 className="text-sm font-bold text-[#202033]">Saved Web Resources & Links</h3>
            <button
              onClick={() => setIsBookmarkModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bookmark</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bookmarks.map((bm: any) => (
              <div
                key={bm.id}
                className="bg-white rounded-2xl border border-[#E5E2F5] p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#EAFBF1] text-[#10B981]">
                      {bm.category || 'WEB'}
                    </span>
                    <button
                      onClick={() => deleteBookmarkMutation.mutate(bm.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#74738A] hover:text-[#E05268]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-sm text-[#202033] hover:text-[#8B45F5] mt-1.5 block tracking-tight flex items-center gap-1.5"
                  >
                    <span className="truncate">{bm.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </a>

                  {bm.description && (
                    <p className="text-xs text-[#74738A] mt-1 line-clamp-2">{bm.description}</p>
                  )}
                </div>

                <div className="text-[11px] text-[#74738A] truncate font-mono pt-2 border-t border-[#E5E2F5]">
                  {bm.url}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== VIEW 7: FOLDERS / COLLECTIONS ==================== */}
      {activeView === 'folders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[#E5E2F5]">
            <h3 className="text-sm font-bold text-[#202033]">Knowledge Collections & Directories</h3>
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Collection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {folders.map((f: any) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs flex items-center justify-between group hover:border-[#8B45F5] transition-all"
              >
                <div
                  onClick={() => {
                    setSelectedFolderId(f.id);
                    setActiveView('notes');
                  }}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${f.color || '#8B45F5'}15`, color: f.color || '#8B45F5' }}
                  >
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-[#202033] truncate">{f.name}</h4>
                    <span className="text-[11px] text-[#74738A]">
                      {f._count?.notes || 0} knowledge notes
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Delete folder '${f.name}'? Notes inside will not be deleted.`)) {
                      deleteFolderMutation.mutate(f.id);
                    }
                  }}
                  className="p-1.5 text-[#74738A] hover:text-[#E05268] opacity-0 group-hover:opacity-100 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== VIEW 8: TAGS CLOUD ==================== */}
      {activeView === 'tags' && (
        <div className="bg-white rounded-2xl p-6 border border-[#E5E2F5] shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#202033] flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#8B45F5]" />
            <span>Interactive Taxonomy & Tags Explorer</span>
          </h3>
          <p className="text-xs text-[#74738A]">
            Click any tag to filter notes across the entire second brain.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {summary.tags && summary.tags.length > 0 ? (
              summary.tags.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTag(t.name);
                    setActiveView('notes');
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#F4F3FF] text-[#6935C8] hover:bg-[#8B45F5] hover:text-white transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <span>#{t.name}</span>
                  <span className="opacity-70 text-[10px]">({t.count})</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-[#74738A] italic">No tags documented yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 9: KNOWLEDGE GRAPH ==================== */}
      {activeView === 'graph' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#202033] flex items-center gap-2">
                <Network className="w-5 h-5 text-[#8B45F5]" />
                <span>Knowledge Graph & Relational Intelligence</span>
              </h3>
              <p className="text-xs text-[#74738A] mt-0.5">
                Visual relationship mapper connecting Notes, Projects, and Tasks into one associative network.
              </p>
            </div>

            <button
              onClick={() => setIsRelationModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Link Assets</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E5E2F5] shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] block">
                  Knowledge Nodes
                </span>
                <span className="text-xl font-black text-[#202033]">{graph.nodes?.length || 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#E5E2F5]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] block">
                  Connections / Edges
                </span>
                <span className="text-xl font-black text-[#202033]">{graph.edges?.length || 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#EAFBF1] border border-[#E5E2F5]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] block">
                  Network Density
                </span>
                <span className="text-xl font-black text-[#202033]">
                  {graph.nodes?.length ? ((graph.edges?.length / graph.nodes.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>

            {/* Relational Edge List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider">
                Active Connections ({graph.edges?.length || 0})
              </h4>
              {graph.edges?.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#74738A] border border-dashed border-[#E5E2F5] rounded-xl">
                  No explicit relations linked yet. Click &apos;Link Assets&apos; above to connect a Note to a Project
                  or Task.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {graph.edges.map((edge: any, i: number) => (
                    <div
                      key={edge.id || i}
                      className="p-3 rounded-xl border border-[#E5E2F5] flex items-center justify-between text-xs bg-[#F4F3FF]/40"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#8B45F5] shrink-0" />
                        <span className="font-bold text-[#202033] truncate">
                          {edge.source?.title || edge.sourceNoteId}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-[#8B45F5] border border-[#E5E2F5] shrink-0">
                        {edge.relationType || 'RELATES_TO'}
                      </span>
                      <div className="flex items-center gap-2 truncate">
                        <ArrowRight className="w-3 h-3 text-[#74738A] shrink-0" />
                        <span className="text-[#74738A] font-semibold truncate">
                          {edge.targetType} #{edge.targetId?.slice(0, 6)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 10: AI SEARCH & ASK ==================== */}
      {activeView === 'ai-search' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E5E2F5] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#202033] flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[#8B45F5]" />
              <span>Grounded AI Search & Second Brain Q&A</span>
            </h3>
            <p className="text-xs text-[#74738A]">
              Execute hybrid semantic and keyword retrieval across all notes, journal reflections, and
              indexed attachments with source verification.
            </p>

            <form onSubmit={handleAskKnowledge} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask any question... e.g., 'What were the action items from the Redis architecture review?'"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs border border-[#E5E2F5] rounded-xl focus:outline-none focus:border-[#8B45F5]"
                />
                <button
                  type="submit"
                  disabled={isAskingAi || !aiQuestion.trim()}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0"
                >
                  {isAskingAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {aiAnswerResult && (
              <div className="mt-4 p-5 rounded-2xl bg-[#F4F3FF] border border-[#E5E2F5] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white text-[#8B45F5] border border-[#E5E2F5] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#8B45F5]" /> Grounded AI Answer
                  </span>
                  <span className="text-xs text-[#74738A]">
                    Source count: {aiAnswerResult.sources?.length || 0}
                  </span>
                </div>

                <div className="text-xs text-[#202033] leading-relaxed whitespace-pre-line font-medium">
                  {aiAnswerResult.answer}
                </div>

                {/* Source Citations */}
                {aiAnswerResult.sources && aiAnswerResult.sources.length > 0 && (
                  <div className="pt-3 border-t border-[#E5E2F5] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block">
                      Cited Sources
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiAnswerResult.sources.map((src: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (src.id) {
                              api.getNoteById(src.id).then((n) => {
                                setEditingNote(n);
                                setModalTab('preview');
                                setIsNoteModalOpen(true);
                              });
                            }
                          }}
                          className="p-2.5 bg-white rounded-xl border border-[#E5E2F5] hover:border-[#8B45F5] cursor-pointer text-xs space-y-1 transition-all"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-[#8B45F5] truncate">{src.title}</span>
                            <span className="text-[#10B981] font-extrabold">{src.score || 95}% match</span>
                          </div>
                          <p className="text-[11px] text-[#74738A] line-clamp-2">{src.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== NOTE MODAL (CREATE / EDIT / PREVIEW / HISTORY / AI) ==================== */}
      {(isNoteModalOpen || editingNote) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-3xl w-full border border-[#E5E2F5] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#202033]">
                  {editingNote ? 'Knowledge Asset' : 'New Knowledge Asset'}
                </h3>
                {editingNote?.category && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#F4F3FF] text-[#8B45F5]">
                    {editingNote.category}
                  </span>
                )}
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 bg-[#F4F3FF] p-1 rounded-xl">
                <button
                  onClick={() => setModalTab('edit')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalTab === 'edit' ? 'bg-[#8B45F5] text-white' : 'text-[#74738A]'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setModalTab('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalTab === 'preview' ? 'bg-[#8B45F5] text-white' : 'text-[#74738A]'
                  }`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setModalTab('ai')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalTab === 'ai' ? 'bg-[#8B45F5] text-white' : 'text-[#74738A]'
                  }`}
                >
                  AI Tools
                </button>
                {editingNote && (
                  <button
                    onClick={() => setModalTab('history')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      modalTab === 'history' ? 'bg-[#8B45F5] text-white' : 'text-[#74738A]'
                    }`}
                  >
                    History
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setEditingNote(null);
                }}
                className="text-xs text-[#74738A] hover:text-[#202033] font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* EDIT TAB */}
              {modalTab === 'edit' && (
                <form
                  id="noteForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                    const category = (form.elements.namedItem('category') as HTMLSelectElement).value;
                    const folderId = (form.elements.namedItem('folderId') as HTMLSelectElement).value || null;
                    const tagsRaw = (form.elements.namedItem('tags') as HTMLInputElement).value;
                    const isPinned = (form.elements.namedItem('isPinned') as HTMLInputElement).checked;

                    const tags = tagsRaw
                      ? tagsRaw
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean)
                      : [];

                    if (editingNote && editingNote.id) {
                      updateNoteMutation.mutate({
                        id: editingNote.id,
                        data: {
                          title,
                          content,
                          category,
                          folderId,
                          tags,
                          isPinned,
                          isJournal: category === 'JOURNAL',
                          journalDate: category === 'JOURNAL' ? journalDate : undefined,
                        },
                      });
                    } else {
                      createNoteMutation.mutate({
                        title,
                        content,
                        category,
                        folderId,
                        tags,
                        isPinned,
                        isJournal: category === 'JOURNAL',
                        journalDate: category === 'JOURNAL' ? journalDate : undefined,
                      });
                    }
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block font-semibold text-[#202033] mb-1">Title *</label>
                    <input
                      name="title"
                      type="text"
                      required
                      defaultValue={editingNote?.title || ''}
                      placeholder="e.g. Distributed Lock Strategy with Redis & BullMQ"
                      className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#202033] mb-1">Category</label>
                      <select
                        name="category"
                        defaultValue={editingNote?.category || 'NOTE'}
                        className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                      >
                        <option value="NOTE">Standard Note</option>
                        <option value="JOURNAL">Daily Journal</option>
                        <option value="IDEA">Idea & Vision</option>
                        <option value="LEARNING">Learning & Reference</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#202033] mb-1">Folder</label>
                      <select
                        name="folderId"
                        defaultValue={editingNote?.folderId || selectedFolderId || ''}
                        className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                      >
                        <option value="">No Folder (Root)</option>
                        {folders.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#202033] mb-1">Content (Markdown Supported) *</label>
                    <textarea
                      name="content"
                      required
                      rows={10}
                      defaultValue={editingNote?.content || ''}
                      placeholder="Use Markdown: # Header, - [ ] Todo, > Quote, `code`..."
                      className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono focus:outline-none focus:border-[#8B45F5] leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#202033] mb-1">Tags (comma separated)</label>
                    <input
                      name="tags"
                      type="text"
                      defaultValue={
                        editingNote?.tags
                          ? editingNote.tags.map((t: any) => t.tag?.name || t).join(', ')
                          : ''
                      }
                      placeholder="redis, postgres, architecture, backend"
                      className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      name="isPinned"
                      type="checkbox"
                      id="isPinnedCheck"
                      defaultChecked={editingNote?.isPinned || false}
                      className="rounded text-[#8B45F5] focus:ring-[#8B45F5]"
                    />
                    <label htmlFor="isPinnedCheck" className="text-xs font-semibold text-[#202033] cursor-pointer">
                      Pin to top of knowledge base
                    </label>
                  </div>
                </form>
              )}

              {/* PREVIEW TAB */}
              {modalTab === 'preview' && (
                <div className="p-4 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF]/20 space-y-3">
                  <h2 className="text-base font-extrabold text-[#202033]">{editingNote?.title}</h2>
                  <div className="pt-2 border-t border-[#E5E2F5]">
                    <SimpleMarkdownRenderer content={editingNote?.content || ''} />
                  </div>
                </div>
              )}

              {/* AI TOOLS TAB */}
              {modalTab === 'ai' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5] space-y-3">
                    <h4 className="font-bold text-[#8B45F5] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI Knowledge Enhancer
                    </h4>
                    <p className="text-[#74738A]">
                      Analyze this note content to extract topics, generate titles, and find action items.
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isSuggestingTitle || !editingNote?.content}
                        onClick={async () => {
                          setIsSuggestingTitle(true);
                          try {
                            const res = await api.suggestTitle(editingNote.content);
                            if (res?.title) {
                              setEditingNote({ ...editingNote, title: res.title });
                              toast.success('Title Suggested', res.title);
                            }
                          } catch (err: any) {
                            toast.error('Title suggestion failed', err.message);
                          } finally {
                            setIsSuggestingTitle(false);
                          }
                        }}
                        className="px-3 py-1.5 font-bold rounded-lg bg-white border border-[#E5E2F5] text-[#8B45F5] hover:bg-[#F4F3FF] shadow-2xs"
                      >
                        {isSuggestingTitle ? 'Generating...' : 'Suggest Title'}
                      </button>

                      <button
                        type="button"
                        disabled={isExtractingTopics || !editingNote?.content}
                        onClick={async () => {
                          setIsExtractingTopics(true);
                          try {
                            const res = await api.extractTopics(editingNote.content, editingNote.title);
                            if (res?.topics) {
                              toast.success('Topics Extracted', res.topics.join(', '));
                            }
                          } catch (err: any) {
                            toast.error('Topic extraction failed', err.message);
                          } finally {
                            setIsExtractingTopics(false);
                          }
                        }}
                        className="px-3 py-1.5 font-bold rounded-lg bg-white border border-[#E5E2F5] text-[#8B45F5] hover:bg-[#F4F3FF] shadow-2xs"
                      >
                        {isExtractingTopics ? 'Extracting...' : 'Extract Topics'}
                      </button>

                      <button
                        type="button"
                        disabled={isExtractingActions || !editingNote?.content}
                        onClick={async () => {
                          setIsExtractingActions(true);
                          try {
                            const res = await api.extractActions(editingNote.content, editingNote.id);
                            if (res?.actions) {
                              setSuggestedActions(res.actions);
                              toast.success('Action Items Extracted', `${res.actions.length} items found.`);
                            }
                          } catch (err: any) {
                            toast.error('Action extraction failed', err.message);
                          } finally {
                            setIsExtractingActions(false);
                          }
                        }}
                        className="px-3 py-1.5 font-bold rounded-lg bg-white border border-[#E5E2F5] text-[#8B45F5] hover:bg-[#F4F3FF] shadow-2xs"
                      >
                        {isExtractingActions ? 'Extracting Actions...' : 'Extract Action Items'}
                      </button>
                    </div>
                  </div>

                  {suggestedActions.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-[#202033] block">Extracted Action Items</span>
                      <div className="space-y-1.5">
                        {suggestedActions.map((action, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl border border-[#E5E2F5] bg-white flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <span className="text-xs text-[#202033]">{action}</span>
                            <button
                              onClick={() => convertToTaskMutation.mutate(action)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg shrink-0 flex items-center gap-1"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>Convert to Task</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REVISION HISTORY TAB */}
              {modalTab === 'history' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#202033]">
                      Revision History ({editingNote?.versions?.length || 0} snapshots)
                    </span>
                    <span className="text-[11px] text-[#74738A]">Automatic versioning on update</span>
                  </div>

                  {editingNote?.versions?.length === 0 ? (
                    <p className="text-[#74738A] italic">No previous revisions stored for this note.</p>
                  ) : (
                    <div className="space-y-2">
                      {editingNote?.versions?.map((ver: any) => (
                        <div
                          key={ver.id}
                          className="p-3 rounded-xl border border-[#E5E2F5] bg-white flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#8B45F5]">v{ver.version}</span>
                              <span className="text-[11px] text-[#74738A]">
                                {format(new Date(ver.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            <h5 className="font-bold text-[#202033] mt-0.5">{ver.title}</h5>
                            <p className="text-[11px] text-[#74738A] line-clamp-1">{ver.content}</p>
                          </div>

                          <button
                            onClick={() =>
                              rollbackMutation.mutate({
                                id: editingNote.id,
                                version: ver.version,
                              })
                            }
                            className="px-3 py-1.5 text-xs font-bold text-[#8B45F5] hover:bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl flex items-center gap-1 shrink-0"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Rollback</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setEditingNote(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF] rounded-xl"
              >
                Close
              </button>
              {modalTab === 'edit' && (
                <button
                  type="submit"
                  form="noteForm"
                  disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-all shadow-xs"
                >
                  {createNoteMutation.isPending || updateNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE FOLDER MODAL ==================== */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Create Folder</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const color = (form.elements.namedItem('color') as HTMLInputElement).value;
                createFolderMutation.mutate({ name, color });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Folder Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. System Architecture"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Color</label>
                <input
                  name="color"
                  type="color"
                  defaultValue="#8B45F5"
                  className="w-8 h-8 rounded-lg cursor-pointer border border-[#E5E2F5]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] rounded-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE BOOKMARK MODAL ==================== */}
      {isBookmarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Save Web Resource</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const url = (form.elements.namedItem('url') as HTMLInputElement).value;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = (form.elements.namedItem('description') as HTMLInputElement).value;
                const category = (form.elements.namedItem('category') as HTMLInputElement).value;
                createBookmarkMutation.mutate({ url, title, description, category });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">URL *</label>
                <input
                  name="url"
                  type="url"
                  required
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Resource Title *</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Next.js App Router Documentation"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Category</label>
                <input
                  name="category"
                  type="text"
                  defaultValue="DEV"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Description</label>
                <input
                  name="description"
                  type="text"
                  placeholder="Brief summary of bookmark"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookmarkModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] rounded-xl"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE DOCUMENT MODAL ==================== */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Upload & Index Document</h3>
            <p className="text-xs text-[#74738A]">
              Add documentation text, system blueprints, or architecture specs for automated chunking and
              semantic search indexing.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fileName = (form.elements.namedItem('fileName') as HTMLInputElement).value;
                const mimeType = (form.elements.namedItem('mimeType') as HTMLSelectElement).value;
                const extractedText = (form.elements.namedItem('extractedText') as HTMLTextAreaElement).value;

                createDocumentMutation.mutate({
                  fileName,
                  mimeType,
                  fileSize: extractedText.length,
                  fileUrl: `local://${fileName}`,
                  extractedText,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Document Name *</label>
                <input
                  name="fileName"
                  type="text"
                  required
                  placeholder="e.g. system_architecture_spec.md"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">MIME Type</label>
                <select
                  name="mimeType"
                  defaultValue="text/markdown"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                >
                  <option value="text/markdown">Markdown (text/markdown)</option>
                  <option value="text/plain">Plain Text (text/plain)</option>
                  <option value="application/pdf">PDF Spec (application/pdf)</option>
                  <option value="application/json">JSON (application/json)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Extracted Text Content *</label>
                <textarea
                  name="extractedText"
                  required
                  rows={8}
                  placeholder="Paste document text to chunk and index into the knowledge vector store..."
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDocumentModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocumentMutation.isPending}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] rounded-xl flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{createDocumentMutation.isPending ? 'Indexing...' : 'Index Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE RELATION MODAL ==================== */}
      {isRelationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Link Knowledge Assets</h3>
            <p className="text-xs text-[#74738A]">
              Connect a note to a Project, Task, or another Note to build an associative knowledge graph.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const sourceNoteId = (form.elements.namedItem('sourceNoteId') as HTMLSelectElement).value;
                const targetType = (form.elements.namedItem('targetType') as HTMLSelectElement).value;
                const targetId = (form.elements.namedItem('targetId') as HTMLInputElement).value;
                const relationType = (form.elements.namedItem('relationType') as HTMLSelectElement).value;

                createRelationMutation.mutate({
                  sourceNoteId,
                  targetType,
                  targetId,
                  relationType,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Source Note *</label>
                <select
                  name="sourceNoteId"
                  required
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                >
                  {notes.map((n: any) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Target Type</label>
                <select
                  name="targetType"
                  defaultValue="PROJECT"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                >
                  <option value="PROJECT">Project</option>
                  <option value="TASK">Task</option>
                  <option value="NOTE">Another Note</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Target ID / Name *</label>
                <input
                  name="targetId"
                  type="text"
                  required
                  placeholder="e.g. Website Redesign"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Relation Type</label>
                <select
                  name="relationType"
                  defaultValue="RELATES_TO"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                >
                  <option value="RELATES_TO">RELATES_TO</option>
                  <option value="REFERENCES">REFERENCES</option>
                  <option value="DEPENDS_ON">DEPENDS_ON</option>
                  <option value="IMPLEMENTS">IMPLEMENTS</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRelationModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRelationMutation.isPending}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] rounded-xl flex items-center gap-1.5"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>{createRelationMutation.isPending ? 'Connecting...' : 'Connect in Graph'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
