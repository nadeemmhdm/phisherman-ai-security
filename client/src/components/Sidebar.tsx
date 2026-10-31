import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  MessageSquare,
  Settings as SettingsIcon,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Server,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Check,
  X,
  Shield,
  Layers,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { Conversation } from '../types';

export const Sidebar: React.FC = () => {
  const {
    conversations,
    activeConversation,
    selectConversation,
    startNewChat,
    renameConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    sidebarOpen,
    setSidebarOpen,
    ollamaStatus,
    refreshOllama,
    switchModel,
    setIsSettingsModalOpen,
  } = useChat();

  const { theme, setTheme } = useTheme();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [isRefreshingOllama, setIsRefreshingOllama] = useState<boolean>(false);

  // Group conversations by date
  const groupConversations = (list: Conversation[]) => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const previous7Days: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 86400000 * 7;

    for (const c of list) {
      const time = new Date(c.updated_at || c.created_at).getTime();
      if (time >= startOfToday) {
        today.push(c);
      } else if (time >= startOfYesterday) {
        yesterday.push(c);
      } else if (time >= startOf7Days) {
        previous7Days.push(c);
      } else {
        older.push(c);
      }
    }

    return { today, yesterday, previous7Days, older };
  };

  const groups = groupConversations(conversations);

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = async (c: Conversation, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      await renameConversation(c.id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete conversation "${c.title}"?`)) {
      await deleteConversation(c.id);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshingOllama(true);
    await refreshOllama();
    setTimeout(() => setIsRefreshingOllama(false), 600);
  };

  if (!sidebarOpen) {
    return (
      <div className="hidden md:flex flex-col items-center justify-between py-4 px-2 w-16 border-r border-border/40 bg-card/60 backdrop-blur-md h-screen">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            title="Expand Sidebar"
          >
            <ShieldAlert className="w-6 h-6" />
          </button>
          <button
            onClick={startNewChat}
            className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all shadow-sm"
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              ollamaStatus?.connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
            }`}
            title={ollamaStatus?.connected ? `Connected (${ollamaStatus.selectedModel})` : 'Ollama Offline'}
          />
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-72 lg:w-80 flex flex-col h-screen border-r border-border/40 bg-card/70 backdrop-blur-xl shrink-0 transition-all select-none">
      {/* Top Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight">PhisherMan</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-primary/10 text-primary font-medium">AI 2.0</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Email Defense Assistant</p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/20 rounded text-primary-foreground/90">
            Ctrl+N
          </kbd>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-secondary/60 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {conversations.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No conversation history yet.</p>
            <p className="mt-1 opacity-75">Start an email investigation or chat with the assistant!</p>
          </div>
        ) : (
          <>
            {renderGroup('Today', groups.today)}
            {renderGroup('Yesterday', groups.yesterday)}
            {renderGroup('Previous 7 Days', groups.previous7Days)}
            {renderGroup('Older', groups.older)}
          </>
        )}
      </div>

      {/* Ollama Model Selector & Status Section */}
      <div className="p-3 border-t border-border/40 bg-secondary/30 space-y-2">
        {/* Connection status line */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                ollamaStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-medium text-[11px] text-muted-foreground">
              {ollamaStatus?.connected ? 'Ollama Online' : 'Ollama Offline'}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Refresh Ollama status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOllama ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Dynamic Model Dropdown */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between mb-1">
            <span>Primary Model</span>
            <Server className="w-3 h-3 opacity-60" />
          </label>
          <select
            value={ollamaStatus?.selectedModel || ''}
            onChange={e => switchModel(e.target.value, false)}
            className="w-full text-xs py-1.5 px-2.5 rounded-lg bg-card border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {ollamaStatus?.models && ollamaStatus.models.length > 0 ? (
              ollamaStatus.models.map(m => (
                <option key={m.name} value={m.name}>
                  {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''}
                </option>
              ))
            ) : (
              <option value="llama3:latest">llama3:latest (Default)</option>
            )}
          </select>
        </div>

        {/* Theme and Settings bottom controls */}
        <div className="pt-2 flex items-center justify-between border-t border-border/20 text-xs text-muted-foreground">
          {/* Theme switcher */}
          <div className="flex items-center bg-card rounded-lg p-0.5 border border-border/40">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md ${theme === 'light' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md ${theme === 'dark' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-md ${theme === 'system' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="System Default"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="text-[11px]">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );

  function renderGroup(title: string, list: Conversation[]) {
    if (list.length === 0) return null;
    return (
      <div>
        <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <div className="space-y-0.5">
          {list.map(c => {
            const isActive = activeConversation?.id === c.id;
            const isEditing = editingId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-secondary font-medium text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2 flex-1">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'opacity-60'}`} />
                  {isEditing ? (
                    <form onSubmit={e => handleSaveRename(c, e)} className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full text-xs py-0.5 px-1 bg-background border border-primary rounded focus:outline-none"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        onClick={e => handleSaveRename(c, e)}
                        className="p-1 text-emerald-500 hover:text-emerald-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  ) : (
                    <span className="truncate">{c.title}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleStartRename(c, e)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => handleDelete(c, e)}
                      className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
};
