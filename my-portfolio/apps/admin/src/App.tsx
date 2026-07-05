import { projectCategoryEnum, skillCategoryEnum, timelineCategoryEnum } from "@portfolio/api";
import type { ProjectInput, SkillInput, TimelineInput } from "@portfolio/api";
import {
  Check,
  Clock3,
  Edit3,
  FolderGit2,
  Layers,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { client } from "./client";

type Tab = "projects" | "skills" | "timeline";

// --- API response types ---
interface SkillItem {
  id: number;
  name: string;
  category: string;
}

interface SkillRelation {
  skillId: number;
  skill: SkillItem;
}

interface ProjectWithRelations {
  id: number;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  githubUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  sortOrder: number;
  achievements: { id: number; content: string }[];
  skills: SkillRelation[];
}

interface TimelineItemWithRelations {
  id: number;
  title: string;
  subtitle: string;
  dateDisplay: string;
  description: string;
  category: string;
  outcome: string | null;
  sortKey: number;
  isFeatured: number;
  achievements: { id: number; content: string }[];
  skills: SkillRelation[];
}

// --- Form editing state type ---
interface EditingItemForm {
  id?: number | null;
  category?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  githubUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  achievements?: string[];
  skills?: number[];
  name?: string;
  dateDisplay?: string;
  outcome?: string | null;
  sortKey?: number;
  isFeatured?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");

  // Data state
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth token state (simple protection)
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("cms_auth_token") || "");
  const [isAuthSaved, setIsAuthSaved] = useState(() => !!localStorage.getItem("cms_auth_token"));

  // Active form state (editing or adding new)
  const [editingItem, setEditingItem] = useState<EditingItemForm | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, tRes] = await Promise.all([
        client.getProjects(),
        client.getSkills(),
        client.getTimeline(),
      ]);
      setProjects(pRes);
      setSkills(sRes);
      setTimeline(tRes);
    } catch (e) {
      console.error("Failed to load portfolio database content:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveAuthToken = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("cms_auth_token", authToken);
    setIsAuthSaved(true);
  };

  const clearAuthToken = () => {
    localStorage.removeItem("cms_auth_token");
    setAuthToken("");
    setIsAuthSaved(false);
  };

  // Image Upload helper
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setEditingItem((prev) => {
        if (!prev) return null;
        return { ...prev, imageUrl: data.imageUrl };
      });
    } catch (_err) {
      alert("Error uploading screenshot to R2 bucket.");
    } finally {
      setUploading(false);
    }
  };

  // Generic Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (activeTab === "projects") {
        const payload = {
          id: editingItem.id || null,
          category: editingItem.category,
          title: editingItem.title,
          subtitle: editingItem.subtitle,
          description: editingItem.description,
          githubUrl: editingItem.githubUrl || null,
          videoUrl: editingItem.videoUrl || null,
          imageUrl: editingItem.imageUrl || null,
          sortOrder: Number(editingItem.sortOrder || 0),
          achievements: editingItem.achievements || [],
          skills: editingItem.skills || [],
        } as ProjectInput;
        await client.saveProject(payload);
      } else if (activeTab === "skills") {
        const payload = {
          id: editingItem.id || null,
          name: editingItem.name,
          category: editingItem.category,
        } as SkillInput;
        await client.saveSkill(payload);
      } else if (activeTab === "timeline") {
        const payload = {
          id: editingItem.id || null,
          title: editingItem.title,
          subtitle: editingItem.subtitle,
          dateDisplay: editingItem.dateDisplay,
          description: editingItem.description,
          category: editingItem.category,
          outcome: editingItem.outcome || null,
          sortKey: Number(editingItem.sortKey || 0),
          isFeatured: !!editingItem.isFeatured,
          achievements: editingItem.achievements || [],
          skills: editingItem.skills || [],
        } as TimelineInput;
        await client.saveTimelineItem(payload);
      }
      setIsFormOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      alert(`Error saving record: ${(err as Error).message}`);
    }
  };

  // Generic Delete handler
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      if (activeTab === "projects") {
        await client.deleteProject({ id });
      } else if (activeTab === "skills") {
        await client.deleteSkill({ id });
      } else if (activeTab === "timeline") {
        await client.deleteTimelineItem({ id });
      }
      fetchData();
    } catch (err) {
      alert(`Error deleting: ${(err as Error).message}`);
    }
  };

  const openForm = (
    item: ProjectWithRelations | SkillItem | TimelineItemWithRelations | null = null,
  ) => {
    if (item) {
      // Map relations format to simple ID arrays for checkboxes/inputs
      const typed = item as ProjectWithRelations | TimelineItemWithRelations;
      const mapped = {
        ...typed,
        skills: [] as number[],
        achievements: [] as string[],
      } as unknown as EditingItemForm;
      if (activeTab === "projects" || activeTab === "timeline") {
        mapped.skills = typed.skills?.map((s: SkillRelation) => s.skillId || s.skill?.id) || [];
        mapped.achievements = typed.achievements?.map((a: { content: string }) => a.content) || [];
      }
      if (activeTab === "timeline") {
        const tl = typed as TimelineItemWithRelations;
        mapped.isFeatured = tl.isFeatured === 1 || !!tl.isFeatured;
      }
      setEditingItem(mapped);
    } else {
      // Setup empty defaults
      if (activeTab === "projects") {
        setEditingItem({
          category: "open-source",
          title: "",
          subtitle: "",
          description: "",
          githubUrl: "",
          videoUrl: "",
          imageUrl: "",
          sortOrder: projects.length + 1,
          achievements: [""],
          skills: [],
        });
      } else if (activeTab === "skills") {
        setEditingItem({
          name: "",
          category: "Programming Languages",
        });
      } else if (activeTab === "timeline") {
        setEditingItem({
          title: "",
          subtitle: "",
          dateDisplay: "",
          description: "",
          category: "hackathon",
          outcome: "",
          sortKey: 202601,
          isFeatured: false,
          achievements: [""],
          skills: [],
        });
      }
    }
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-neutral-900 text-white shrink-0 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <Settings className="text-blue-400 animate-spin-slow" size={24} />
            <h1 className="text-lg font-bold tracking-tight">Portfolio CMS</h1>
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("projects");
                setIsFormOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <FolderGit2 size={18} />
              Projects
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("skills");
                setIsFormOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "skills"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <Layers size={18} />
              Skills
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("timeline");
                setIsFormOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <Clock3 size={18} />
              Timeline
            </button>
          </nav>
        </div>

        {/* Security Password Box */}
        <div className="mt-8 border-t border-neutral-800 pt-6">
          {!isAuthSaved ? (
            <form onSubmit={saveAuthToken} className="space-y-2">
              <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                Admin Password
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Enter password..."
                className="w-full text-xs bg-neutral-800 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs p-2 rounded cursor-pointer"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2 bg-neutral-800 p-3 rounded text-xs text-green-400 font-mono">
              <span>Token Configured</span>
              <button
                type="button"
                onClick={clearAuthToken}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                [Clear]
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 bg-neutral-50 dark:bg-neutral-950 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 border-b border-neutral-200 dark:border-neutral-900 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight capitalize text-neutral-900 dark:text-white">
              {activeTab} Manager
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Create, update, and delete entries in the portfolio database.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openForm()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add New</span>
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 font-mono text-xs text-neutral-500">
            Loading data from Cloudflare D1...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {/* --- PROJECTS TAB --- */}
            {activeTab === "projects" &&
              projects.map((p: ProjectWithRelations) => (
                <div
                  key={p.id}
                  className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded">
                        {p.category}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">
                        Order: {p.sortOrder}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                      {p.title}
                    </h4>
                    <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
                      {p.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openForm(p)}
                      className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-950 cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 border border-red-100 dark:border-red-950 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

            {/* --- SKILLS TAB --- */}
            {activeTab === "skills" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {skills.map((s: SkillItem) => (
                  <div
                    key={s.id}
                    className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-sm flex justify-between items-center gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">
                        {s.category}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {s.name}
                      </h4>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openForm(s)}
                        className="p-1.5 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-50 dark:hover:bg-neutral-950 cursor-pointer"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 border border-red-100 dark:border-red-950 text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- TIMELINE TAB --- */}
            {activeTab === "timeline" &&
              timeline.map((t: TimelineItemWithRelations) => (
                <div
                  key={t.id}
                  className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded">
                        {t.category}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">{t.dateDisplay}</span>
                      {t.isFeatured === 1 && (
                        <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Featured
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                      {t.title}
                    </h4>
                    <p className="text-xs font-semibold text-neutral-500 font-mono">{t.subtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openForm(t)}
                      className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-950 cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-2 border border-red-100 dark:border-red-950 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Slide-out Form Drawer Overlay */}
      {isFormOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-950 p-8 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-900">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {editingItem.id ? "Edit" : "Create New"} {activeTab.slice(0, -1)}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingItem(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {/* --- SKILLS FORM --- */}
                {activeTab === "skills" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                        Category
                      </label>
                      <select
                        value={editingItem.category}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, category: e.target.value })
                        }
                        className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      >
                        {skillCategoryEnum.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* --- PROJECTS FORM --- */}
                {activeTab === "projects" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editingItem.title}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, title: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Subtitle
                        </label>
                        <input
                          type="text"
                          required
                          value={editingItem.subtitle}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, subtitle: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Category
                        </label>
                        <select
                          value={editingItem.category}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, category: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        >
                          {projectCategoryEnum.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          required
                          value={editingItem.sortOrder}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, sortOrder: Number(e.target.value) })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                        Description
                      </label>
                      <textarea
                        required
                        value={editingItem.description}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, description: e.target.value })
                        }
                        rows={3}
                        className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none"
                      />
                    </div>

                    {/* Screenshot Upload (R2 integration) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        Screenshot
                      </label>
                      <div className="flex gap-4 items-center">
                        <input
                          type="text"
                          placeholder="/r2/projects/..."
                          value={editingItem.imageUrl || ""}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, imageUrl: e.target.value })
                          }
                          className="flex-1 text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                        <label className="flex items-center gap-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer">
                          <Upload size={14} />
                          <span>{uploading ? "Uploading..." : "Upload R2"}</span>
                          <input
                            type="file"
                            onChange={handleImageUpload}
                            className="hidden"
                            accept="image/*"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          GitHub URL
                        </label>
                        <input
                          type="text"
                          value={editingItem.githubUrl || ""}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, githubUrl: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Demo Video URL
                        </label>
                        <input
                          type="text"
                          value={editingItem.videoUrl || ""}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, videoUrl: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Achievements List */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        Achievements / bullet points
                      </label>
                      {editingItem.achievements?.map((ach: string, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={ach}
                            onChange={(e) => {
                              const next = [...(editingItem.achievements || [])];
                              next[idx] = e.target.value;
                              setEditingItem({ ...editingItem, achievements: next });
                            }}
                            className="flex-1 text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = editingItem.achievements?.filter(
                                (_: unknown, i: number) => i !== idx,
                              );
                              setEditingItem({ ...editingItem, achievements: next });
                            }}
                            className="p-2 text-red-500 hover:bg-neutral-100 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingItem({
                            ...editingItem,
                            achievements: [...(editingItem.achievements || []), ""],
                          })
                        }
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Add Bullet Point
                      </button>
                    </div>

                    {/* Tagged Skills Checklist */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        Tag Technologies
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
                        {skills.map((s) => {
                          const isChecked = editingItem.skills?.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 text-xs font-mono text-neutral-700 dark:text-neutral-300"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const current = [...(editingItem.skills || [])];
                                  const next = isChecked
                                    ? current.filter((id) => id !== s.id)
                                    : [...current, s.id];
                                  setEditingItem({ ...editingItem, skills: next });
                                }}
                              />
                              <span>{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TIMELINE FORM --- */}
                {activeTab === "timeline" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Title / Role
                        </label>
                        <input
                          type="text"
                          required
                          value={editingItem.title}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, title: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Subtitle / Company
                        </label>
                        <input
                          type="text"
                          required
                          value={editingItem.subtitle}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, subtitle: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Date Display
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. May 2026"
                          value={editingItem.dateDisplay}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, dateDisplay: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Sort Key (YYYYMM)
                        </label>
                        <input
                          type="number"
                          required
                          value={editingItem.sortKey}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, sortKey: Number(e.target.value) })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Category
                        </label>
                        <select
                          value={editingItem.category}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, category: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        >
                          {timelineCategoryEnum.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          Outcome / Award
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Winner (Optional)"
                          value={editingItem.outcome || ""}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, outcome: e.target.value })
                          }
                          className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          id="chk-featured"
                          type="checkbox"
                          checked={editingItem.isFeatured}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, isFeatured: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                        />
                        <label
                          htmlFor="chk-featured"
                          className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300"
                        >
                          Featured (show on timeline page)
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                        Description
                      </label>
                      <textarea
                        required
                        value={editingItem.description}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, description: e.target.value })
                        }
                        rows={3}
                        className="w-full text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none"
                      />
                    </div>

                    {/* Achievements List */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        Achievements / bullet points
                      </label>
                      {editingItem.achievements?.map((ach: string, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={ach}
                            onChange={(e) => {
                              const next = [...(editingItem.achievements || [])];
                              next[idx] = e.target.value;
                              setEditingItem({ ...editingItem, achievements: next });
                            }}
                            className="flex-1 text-xs font-mono border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg outline-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = editingItem.achievements?.filter(
                                (_: unknown, i: number) => i !== idx,
                              );
                              setEditingItem({ ...editingItem, achievements: next });
                            }}
                            className="p-2 text-red-500 hover:bg-neutral-100 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingItem({
                            ...editingItem,
                            achievements: [...(editingItem.achievements || []), ""],
                          })
                        }
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Add Bullet Point
                      </button>
                    </div>

                    {/* Tagged Skills Checklist */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        Tag Skills
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
                        {skills.map((s) => {
                          const isChecked = editingItem.skills?.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 text-xs font-mono text-neutral-700 dark:text-neutral-300"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const current = [...(editingItem.skills || [])];
                                  const next = isChecked
                                    ? current.filter((id) => id !== s.id)
                                    : [...current, s.id];
                                  setEditingItem({ ...editingItem, skills: next });
                                }}
                              />
                              <span>{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 border-t border-neutral-200 dark:border-neutral-900 pt-6 mt-6">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
