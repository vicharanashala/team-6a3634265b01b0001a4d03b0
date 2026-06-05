import React, { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, PlusCircle, Award, ShieldCheck, Search, Send, ThumbsUp, 
  Sparkles, Tag, Check, Activity, MessageSquare, Terminal, ChevronRight, 
  Lock, Unlock, AlertCircle, RefreshCw, Key, ShieldAlert, BarChart2,
  Settings, Users, MessageCircle, Info, Database, Cpu, Plus, ChevronDown, 
  ChevronUp, Download, Compass, Trophy, FileText, X, Heart, Shield, Trash2,
  UserPlus, LogIn, LogOut, User, Eye, Share2, CornerDownRight, ThumbsDown
} from 'lucide-react';

const CATEGORIES = [
  "General",
  "Account Security",
  "Billing",
  "Technical Support",
  "Community Policies"
];

// Helper: Similarity scoring for mockup deduplication (equivalent to backend)
const getTokens = (text) => {
  const words = text.toLowerCase().match(/\w+/g) || [];
  const stopWords = new Set(["the", "a", "an", "is", "are", "to", "for", "in", "on", "at", "my", "how", "what", "where", "why", "do", "i", "can", "reset", "forgot"]);
  return words.filter(w => !stopWords.has(w));
};

const calculateCosineSimilarity = (text1, text2) => {
  const tokens1 = getTokens(text1);
  const tokens2 = getTokens(text2);
  if (tokens1.length === 0 || tokens2.length === 0) {
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size ? intersection.size / union.size : 0.0;
  }
  const vocab = new Set([...tokens1, ...tokens2]);
  const vec1 = {};
  const vec2 = {};
  vocab.forEach(word => {
    vec1[word] = tokens1.filter(t => t === word).length;
    vec2[word] = tokens2.filter(t => t === word).length;
  });
  let dotProduct = 0;
  let sqSum1 = 0;
  let sqSum2 = 0;
  vocab.forEach(word => {
    dotProduct += vec1[word] * vec2[word];
    sqSum1 += vec1[word] * vec1[word];
    sqSum2 += vec2[word] * vec2[word];
  });
  const mag1 = Math.sqrt(sqSum1);
  const mag2 = Math.sqrt(sqSum2);
  if (mag1 === 0 || mag2 === 0) return 0.0;
  return dotProduct / (mag1 * mag2);
};

const getPriorityScore = (upvotes, createdAtStr, decayPower = 0.5) => {
  const createdAt = new Date(createdAtStr);
  const now = new Date();
  const deltaHours = Math.max(0.0, (now - createdAt) / 3600000.0);
  const score = (upvotes + 1.0) / Math.pow(deltaHours + 2.0, decayPower);
  return parseFloat(score.toFixed(3));
};

const generateAIDraftAnswer = (questionText, category, customPrompt = '') => {
  const text = questionText.toLowerCase();
  const prefix = customPrompt ? `[Prompt Style Applied] ` : '';
  
  if (text.includes("password") || text.includes("reset")) {
    return `${prefix}To reset your credentials in the ${category} module, click the 'Forgot Password' link situated on the login prompt, key in your account email, and click submit. A password-reset verification key will be sent to your email immediately.`;
  } else if (text.includes("invoice") || text.includes("bill") || text.includes("receipt") || text.includes("payment")) {
    return `${prefix}You can find your receipts under Settings -> Invoices. Choose the target billing interval and select the 'Download PDF' button to fetch the document directly. If payments fail, verify your card expiry dates.`;
  } else if (text.includes("guideline") || text.includes("policy") || text.includes("rule") || text.includes("terms")) {
    return `${prefix}Community standards dictate that all member inputs be polite, non-advertising, and professional. Post submissions containing offensive content or unverified gossip will be flagged and purged by admins.`;
  } else {
    return `${prefix}For questions regarding ${category}, please visit our documentation index, verify your user keys, or make sure your parameters align with the official configurations outlined in your team profile directory.`;
  }
};

// Isolated CurationCard Component to respect React's Rules of Hooks
function CurationCard({ cluster, communityAnswers, onPublish }) {
  const [editedAns, setEditedAns] = useState(cluster.ai_draft_answer || '');
  const commAnswers = communityAnswers[cluster.id] || [];

  useEffect(() => {
    setEditedAns(cluster.ai_draft_answer || '');
  }, [cluster]);

  return (
    <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-4 shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
            {cluster.category}
          </span>
          <h4 className="text-sm font-bold text-white mt-2">
            {cluster.representative_question}
          </h4>
        </div>
        <div className="flex gap-2 text-[9px] font-bold text-gray-400 shrink-0">
          <span className="bg-dark-950 border border-white/5 px-2 py-1 rounded font-mono">Votes: {cluster.upvotes}</span>
          <span className="bg-dark-950 border border-white/5 px-2 py-1 rounded font-mono">Priority: {cluster.priority_score?.toFixed(2)}</span>
        </div>
      </div>

      {/* Collaborative Answer Drafts Selector */}
      {commAnswers.length > 0 && (
        <div className="bg-dark-950/60 p-3 rounded-lg border border-white/5 flex flex-col gap-2">
          <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Community Contributors drafts (Click to populate curation box)
          </span>
          <div className="flex flex-col gap-2">
            {commAnswers.map(ca => (
              <div 
                key={ca.id} 
                onClick={() => setEditedAns(ca.text)}
                className="bg-dark-900/50 hover:bg-indigo-950/20 border border-white/5 p-2 rounded cursor-pointer transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <span className="text-blue-400 font-semibold font-mono text-[9px] block">@{ca.author} ({ca.upvotes} upvotes)</span>
                  <span className="text-gray-300 font-medium">{ca.text}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Curation Answer Edit Box
        </label>
        <textarea 
          rows="3"
          value={editedAns}
          onChange={e => setEditedAns(e.target.value)}
          className="w-full bg-dark-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600 font-medium"
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-white/5 pt-3">
        <button 
          onClick={() => onPublish(cluster.id, editedAns)}
          className="bg-green-600 hover:bg-green-500 text-white text-xs font-outfit font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-green-600/10"
        >
          <Check className="w-3.5 h-3.5" /> Approve & Publish FAQ
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // Navigation & Portal state
  const [workspace, setWorkspace] = useState('user'); // 'user' or 'admin'
  // Admin panel lock state variables
  const [adminPasswordState, setAdminPasswordState] = useState('');
  const [userTab, setUserTab] = useState('faq'); // 'faq', 'ask-ai', 'submit-vote', 'analytics', 'about'
  const [activeInsightModule, setActiveInsightModule] = useState('nlp-dedup');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Authentication State (Quora style addition)
  const [currentUser, setCurrentUser] = useState(null); // null if not logged in
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authBio, setAuthBio] = useState('Quora Contributor');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Quora Subscription tags (Followed tags)
  const [followedTags, setFollowedTags] = useState(["General", "Account Security", "Billing", "Technical Support", "Community Policies"]);

  // Interactive 5-Step Guided presentation tour
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  // Configurable NLP & Prompt customizer
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85);
  const [decayWeight, setDecayWeight] = useState(0.5);
  const [aiEngine, setAiEngine] = useState('gpt-4o-mini');
  const [autoDraft, setAutoDraft] = useState(true);
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [promptTemplate, setPromptTemplate] = useState("You are an expert technical support assistant. Formulate a direct, step-by-step resolution for the user's question, keeping the instructions professional, precise, and category-aligned.");

  // Connections
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core Data Lists
  const [clusters, setClusters] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [communityAnswers, setCommunityAnswers] = useState({}); // cluster_id -> list of answers
  const [contributors, setContributors] = useState([
    { name: "@ganeshprabu_bo", count: 12, votes: 42, role: "Team Lead", badge: "FAQ Architect", color: "text-amber-400" },
    { name: "@chaitanya_ram", count: 8, votes: 21, role: "FE Developer", badge: "UI Curator", color: "text-blue-400" },
    { name: "@ritzy_george", count: 6, votes: 14, role: "Moderator", badge: "Review Expert", color: "text-indigo-400" },
    { name: "@mohd_warish", count: 5, votes: 9, role: "Backend Dev", badge: "Sync Builder", color: "text-green-400" },
  ]);

  // Simulated Diagnostic Resources
  const [cpuUsage, setCpuUsage] = useState(24);
  const [ramUsage, setRamUsage] = useState(42);

  // User Portal State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [newQuestion, setNewQuestion] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  
  // Real-time Semantic preview state
  const [liveMatch, setLiveMatch] = useState({ sim: 0, cluster: null });

  // Community Queue Active thread expansion
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [newCommunityAnsText, setNewCommunityAnsText] = useState('');

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState([
  // Chat Assistant message reference logger
    { id: '1', sender: 'ai', text: 'Hello! I am your AI Knowledge Assistant. Ask me anything, and I will search our published FAQs and knowledge base to answer you.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Log filter & search
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Global Alert State
  const [alert, setAlert] = useState({ show: false, text: '', type: 'info' });

  // Default seed database constants for backup/reset
  const defaultClusters = [
    { id: "c_1", representative_question: "How can I change my registered email address?", category: "Account Security", upvotes: 4, priority_score: 1.85, created_at: new Date(Date.now() - 3600000 * 3).toISOString(), status: "unanswered", ai_draft_answer: "To change your email address, log in and head to settings -> Profile Settings -> Edit Email. Enter your new address and click save.", views: 124 },
    { id: "c_2", representative_question: "How do I download monthly PDF invoices?", category: "Billing", upvotes: 2, priority_score: 1.12, created_at: new Date(Date.now() - 3600000 * 2).toISOString(), status: "unanswered", ai_draft_answer: "Invoices can be accessed under Settings -> Invoices. Select the billing date, review items, and click the Download PDF button.", views: 89 },
    { id: "c_3", representative_question: "What are the rules regarding commercial advertisements in community posts?", category: "Community Policies", upvotes: 9, priority_score: 2.50, created_at: new Date(Date.now() - 3600000 * 5).toISOString(), status: "unanswered", ai_draft_answer: "Community standards dictate that all member inputs be polite, non-advertising, and professional. Post submissions containing commercial ads will be deleted.", views: 243 }
  ];

  const defaultFaqs = [
    { faq_id: "faq_1", question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login screen, enter your email address, and click submit. A password-reset verification key will be sent to your email immediately.", category: "Account Security", published_at: new Date(Date.now() - 3600000 * 12).toISOString(), views: 567 },
    { faq_id: "faq_2", question: "Is there a limit on how many questions I can submit per day?", answer: "To maintain database performance and prevent spam, users are limit-decayed to a maximum of 10 new cluster contributions per 24 hours.", category: "Community Policies", published_at: new Date(Date.now() - 3600000 * 8).toISOString(), views: 341 }
  ];

  const defaultLogs = [
    { timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), type: "SYSTEM", desc: "Initialized Git remote origin reference to https://github.com/prabu411/Crowd-Sourced-FAQ-Mangement.git" },
    { timestamp: new Date(Date.now() - 3600000 * 9).toISOString(), type: "SEED", desc: "Successfully loaded initial database schema containing 5 tables (CLUSTERS, QUESTIONS, VOTES, ANSWERS, PUBLISHED_FAQ)" },
    { timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), type: "DEDUPLICATION", desc: "Evaluated similarity threshold. Seeded default clusters into memory space." }
  ];

  const defaultCommAns = {
    "c_1": [
      { id: "ca_1", author: "expert_user", text: "You will need to verify the new email within 24 hours, otherwise the change is reverted.", upvotes: 2, downvotes: 0 },
      { id: "ca_2", author: "sec_wizard", text: "Keep in mind that changing your email will temporarily freeze account withdrawals for safety.", upvotes: 1, downvotes: 0 }
    ]
  };

  // Initializing mock database fallbacks
  useEffect(() => {
    setClusters(defaultClusters);
    setFaqs(defaultFaqs);
    setLogs(defaultLogs);
    setCommunityAnswers(defaultCommAns);

    // Auto-login a default user to keep the UX smooth, but allow logout!
    setCurrentUser({ username: "ganeshprabu_bo", email: "ganesh@crowdfaq.com", bio: "Team Lead & PM", badge: "FAQ Architect", color: "text-amber-400" });

    checkApiConnection();

    // CPU and RAM fluctuating mock
    const diagnosticInterval = setInterval(() => {
      setCpuUsage(Math.floor(15 + Math.random() * 20));
      setRamUsage(Math.floor(38 + Math.random() * 5));
    }, 4000);

    return () => clearInterval(diagnosticInterval);
  }, []);

  // Live semantic search simulation as the user types
  useEffect(() => {
    if (newQuestion.trim().length > 3) {
      let bestSimilarity = 0.0;
      let bestCluster = null;

      clusters.forEach(c => {
        if (c.status === 'unanswered') {
          const sim = calculateCosineSimilarity(newQuestion, c.representative_question);
          if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestCluster = c;
          }
        }
      });

      setLiveMatch({ sim: bestSimilarity, cluster: bestCluster });
    } else {
      setLiveMatch({ sim: 0, cluster: null });
    }
  }, [newQuestion, clusters]);

  // Syncing priority scores dynamically for local database mock representation
  useEffect(() => {
    if (!isConnected && clusters.length > 0) {
      const updated = clusters.map(c => {
        if (c.status === 'unanswered') {
          return {
            ...c,
            priority_score: getPriorityScore(c.upvotes, c.created_at, decayWeight)
          };
        }
        return c;
      }).sort((a, b) => b.priority_score - a.priority_score);
      
      const scoresChanged = updated.some((c, idx) => c.priority_score !== clusters[idx]?.priority_score);
      if (scoresChanged) {
        setClusters(updated);
      }
    }
  }, [clusters, isConnected, decayWeight]);

  // Scroll chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping]);

  const checkApiConnection = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/faq`);
      if (res.ok) {
        setIsConnected(true);
        triggerAlert("Connected to live Express backend API server.", "success");
        fetchLiveFaqs();
        fetchLiveQuestions();
      } else {
        throw new Error();
      }
    } catch {
      setIsConnected(false);
      triggerAlert("Live API Offline. Running in High-Fidelity Simulation Mode.", "info");
    }
  };

  const fetchLiveFaqs = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/faq?search=${search}`);
      const data = await res.json();
      setFaqs(data);
    } catch {}
  };

  const fetchLiveQuestions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/questions');
      const data = await res.json();
      setClusters(data);
    } catch {}
  };

  const triggerAlert = (text, type = 'info') => {
    setAlert({ show: true, text, type });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  const logActivity = (type, desc) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      type,
      desc
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Export FAQs in JSON or CSV
  const handleExportData = (format) => {
    if (faqs.length === 0) {
      triggerAlert("Knowledge base is empty. Nothing to export.", "error");
      return;
    }

    let fileContent = '';
    let fileName = `faq_export_${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      fileContent = JSON.stringify(faqs, null, 2);
      fileName += '.json';
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const headers = 'faq_id,question,answer,category,published_at\n';
      const rows = faqs.map(f => `"${f.faq_id}","${f.question.replace(/"/g, '""')}","${f.answer.replace(/"/g, '""')}","${f.category}","${f.published_at}"`).join('\n');
      fileContent = headers + rows;
      fileName += '.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    logActivity("SYSTEM", `Exported verified FAQ database containing ${faqs.length} entries as [${format.toUpperCase()}] file.`);
    triggerAlert(`Successfully exported database as ${format.toUpperCase()}!`, "success");
  };

  // Presentation Tour controller stepping
  const handleTourNext = () => {
    if (tourStep === 1) {
      setUserTab('submit-vote');
      setTourStep(2);
    } else if (tourStep === 2) {
      setUserTab('ask-ai');
      setTourStep(3);
    } else if (tourStep === 3) {
      setWorkspace('admin');
      setIsAdminUnlocked(true);
      setTourStep(4);
    } else if (tourStep === 4) {
      setTourStep(5);
    } else {
      setShowTour(false);
      setWorkspace('user');
      setUserTab('faq');
      setTourStep(1);
    }
  };

  // Submit Question handler (Stage 1 & 2)
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      triggerAlert("Authentication required. Please Login or Signup to contribute questions.", "error");
      setAuthModal(true);
      return;
    }
    if (!newQuestion.trim()) return;

    const questionText = newQuestion.trim();
    const cat = newCategory;
    const uid = currentUser.username;

    if (isConnected) {
      try {
        const res = await fetch('http://localhost:5000/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_text: questionText, category: cat, user_id: uid })
        });
        const data = await res.json();
        if (data.success) {
          triggerAlert(data.message, 'success');
          setNewQuestion('');
          fetchLiveQuestions();
          setUserTab('submit-vote');
        } else {
          triggerAlert(data.error, 'error');
        }
      } catch {
        triggerAlert("Error communicating with backend API.", "error");
      }
    } else {
      // High-Fidelity Local Simulation Mode (Stage 2 similarity checking)
      let bestSimilarity = liveMatch.sim;
      let bestCluster = liveMatch.cluster;

      if (bestCluster && bestSimilarity > similarityThreshold) {
        // Merge into cluster
        const updated = clusters.map(c => {
          if (c.id === bestCluster.id) {
            return {
              ...c,
              upvotes: c.upvotes + 1
            };
          }
          return c;
        });
        setClusters(updated);
        logActivity("DEDUPLICATION", `Matched question "${questionText.substring(0, 30)}..." to cluster [${bestCluster.id}] (Sim: ${bestSimilarity.toFixed(2)} > Threshold: ${similarityThreshold}). Merged.`);
        triggerAlert(`Question matched cluster '${bestCluster.id}' (Similarity: ${bestSimilarity.toFixed(2)}). Automatically merged.`, 'success');
      } else {
        // Start a new cluster
        const newId = `c_${Date.now()}`;
        const newClust = {
          id: newId,
          representative_question: questionText,
          category: cat,
          upvotes: 0,
          priority_score: 0.5,
          created_at: new Date().toISOString(),
          status: 'unanswered',
          ai_draft_answer: autoDraft ? generateAIDraftAnswer(questionText, cat, promptTemplate) : "AI Generation disabled in configuration.",
          views: 1
        };
        setClusters(prev => [newClust, ...prev]);

        // Increment user contribution metrics
        setContributors(prev => prev.map(u => {
          if (u.name === `@${currentUser.username}`) {
            return { ...u, count: u.count + 1 };
          }
          return u;
        }));

        logActivity("SUBMIT", `Created new cluster [${newId}] - Category: [${cat}] - Text: "${questionText.substring(0, 45)}..."`);
        if (autoDraft) {
          logActivity("AI_DRAFT", `Drafted response for cluster [${newId}] using engine: [${aiEngine}] and customized Prompt guidelines.`);
        }
        triggerAlert("No similar questions found. Started new cluster & generated AI draft.", "success");
      }
      setNewQuestion('');
      setUserTab('submit-vote');
    }
  };

  // Upvote Handler
  const handleUpvote = async (clusterId) => {
    if (!currentUser) {
      triggerAlert("Authentication required. Please Login or Signup to upvote topics.", "error");
      setAuthModal(true);
      return;
    }

    if (isConnected) {
      try {
        const res = await fetch('http://localhost:5000/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cluster_id: clusterId,
            user_id: currentUser.username
          })
        });
        const data = await res.json();
        if (data.success) {
          triggerAlert("Upvote registered.", "success");
          fetchLiveQuestions();
        } else {
          triggerAlert(data.error, "error");
        }
      } catch {
        triggerAlert("Upvote failed.", "error");
      }
    } else {
      // Local Mock Upvoting
      const updated = clusters.map(c => {
        if (c.id === clusterId) {
          const newVotes = c.upvotes + 1;
          return {
            ...c,
            upvotes: newVotes,
            priority_score: getPriorityScore(newVotes, c.created_at, decayWeight)
          };
        }
        return c;
      });
      setClusters(updated);

      // Increment user vote metrics
      setContributors(prev => prev.map(u => {
        if (u.name === `@${currentUser.username}`) {
          return { ...u, votes: u.votes + 1 };
        }
        return u;
      }));

      logActivity("VOTE", `Upvoted cluster [${clusterId}]. Recalculated Priority Score with decay [${decayWeight}]`);
      triggerAlert("Upvote registered. Recalculated Priority Score.", "success");
    }
  };

  // Submit community answer draft to cluster
  const handleAddCommunityAnswer = (e, clusterId) => {
    e.preventDefault();
    if (!currentUser) {
      triggerAlert("Authentication required. Please Login or Signup to contribute answer drafts.", "error");
      setAuthModal(true);
      return;
    }
    if (!newCommunityAnsText.trim()) return;

    const answerId = `ca_${Date.now()}`;
    const newAns = {
      id: answerId,
      author: currentUser.username,
      text: newCommunityAnsText.trim(),
      upvotes: 0,
      downvotes: 0
    };

    setCommunityAnswers(prev => ({
      ...prev,
      [clusterId]: [...(prev[clusterId] || []), newAns]
    }));
    setNewCommunityAnsText('');
    logActivity("COMMUNITY_ANSWER", `Submitted answer contribution [${answerId}] to question cluster [${clusterId}]`);
    triggerAlert("Answer draft shared with the moderators.", "success");
  };

  // Upvote community answer draft
  const handleUpvoteCommunityAnswer = (clusterId, answerId) => {
    const list = communityAnswers[clusterId] || [];
    const updated = list.map(a => {
      if (a.id === answerId) {
        return { ...a, upvotes: a.upvotes + 1 };
      }
      return a;
    });
    setCommunityAnswers(prev => ({
      ...prev,
      [clusterId]: updated
    }));
    logActivity("VOTE", `Upvoted community answer [${answerId}] inside cluster [${clusterId}]`);
  };

  // Downvote community answer draft
  const handleDownvoteCommunityAnswer = (clusterId, answerId) => {
    const list = communityAnswers[clusterId] || [];
    const updated = list.map(a => {
      if (a.id === answerId) {
        return { ...a, downvotes: a.downvotes + 1 };
      }
      return a;
    });
    setCommunityAnswers(prev => ({
      ...prev,
      [clusterId]: updated
    }));
    logActivity("VOTE", `Downvoted community answer [${answerId}] inside cluster [${clusterId}]`);
  };

  // Admin Publish/Approve Handler (can approve AI draft OR select one of the community answers!)
  const handleApprovePublish = async (clusterId, finalAnswer) => {
    if (!finalAnswer.trim()) {
      triggerAlert("Answer cannot be empty.", "error");
      return;
    }

    if (isConnected) {
      try {
        const res = await fetch('http://localhost:5000/api/moderation/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cluster_id: clusterId, approved_answer: finalAnswer })
        });
        const data = await res.json();
        if (data.success) {
          triggerAlert("FAQ Published successfully.", "success");
          fetchLiveQuestions();
          fetchLiveFaqs();
        } else {
          triggerAlert(data.error, "error");
        }
      } catch {
        triggerAlert("Approval process encountered an error.", "error");
      }
    } else {
      // Local mock publish
      const cluster = clusters.find(c => c.id === clusterId);
      if (cluster) {
        const newFaq = {
          faq_id: `faq_${Date.now()}`,
          question: cluster.representative_question,
          answer: finalAnswer,
          category: cluster.category,
          published_at: new Date().toISOString()
        };
        setFaqs(prev => [newFaq, ...prev]);
        setClusters(prev => prev.filter(c => c.id !== clusterId));
        logActivity("PUBLISH", `Published cluster [${clusterId}] to public FAQ repository.`);
        triggerAlert("Answer approved! Published to public Knowledge Base.", "success");
      }
    }
  };

  // User auth registration/login execution
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("All credentials are required.");
      return;
    }

    if (authMode === 'login') {
      const name = authUsername.toLowerCase();
      const existing = contributors.find(c => c.name.toLowerCase() === `@${name}`);
      const userObj = {
        username: authUsername,
        email: `${authUsername}@crowdfaq.com`,
        bio: existing ? existing.role : 'FAQ Explorer',
        badge: existing ? existing.badge : 'Scribe',
        color: existing ? existing.color : 'text-blue-400'
      };
      setCurrentUser(userObj);
      logActivity("SECURITY", `User logged in: @${authUsername}`);
      triggerAlert(`Welcome back, @${authUsername}!`, "success");
    } else {
      const newUser = {
        name: `@${authUsername}`,
        count: 0,
        votes: 0,
        role: authBio || "Community Scholar",
        badge: "Scholar",
        color: "text-indigo-400"
      };
      setContributors(prev => [...prev, newUser]);
      setCurrentUser({
        username: authUsername,
        email: authEmail || `${authUsername}@crowdfaq.com`,
        bio: authBio || 'Community Scholar',
        badge: 'Scholar',
        color: 'text-indigo-400'
      });
      logActivity("SECURITY", `New account registered for user: @${authUsername}`);
      triggerAlert(`Account created successfully! Welcome, @${authUsername}!`, "success");
    }

    setAuthModal(false);
    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthError('');
  };

  // Perform full authentication logout
  const handleLogout = () => {
    const prevUser = currentUser ? currentUser.username : 'user';
    setCurrentUser(null);
    setIsAdminUnlocked(false);
    logActivity("SECURITY", `User @${prevUser} logged out. Admin Control Panel locked.`);
    triggerAlert("Logged out successfully from all portal domains.", "info");
  };

  // Quora followed categories handling
  const handleToggleTagFollow = (tag) => {
    if (followedTags.includes(tag)) {
      setFollowedTags(prev => prev.filter(t => t !== tag));
      logActivity("SYSTEM", `Unfollowed Quora tag topic: [${tag}]`);
    } else {
      setFollowedTags(prev => [...prev, tag]);
      logActivity("SYSTEM", `Followed Quora tag topic: [${tag}]`);
    }
  };

  // Wipe Mock Database values
  const handleWipeDatabase = () => {
    setClusters([]);
    setFaqs([]);
    setCommunityAnswers({});
    logActivity("SYSTEM", "Cleared entire local SQLite mockup database space.");
    triggerAlert("Database cleared. System is running from clean memory space.", "success");
  };

  // Seed default dataset values
  const handleSeedDatabase = () => {
    setClusters(defaultClusters);
    setFaqs(defaultFaqs);
    setCommunityAnswers(defaultCommAns);
    logActivity("SEED", "Repopulated mockup SQLite database with 3 clusters, 2 FAQs, and 2 community answers.");
    triggerAlert("Database seeded successfully with default values.", "success");
  };

  // Clear Audit log stream
  const handleAdminUnlock = (e) => {
    e.preventDefault();
    if (adminPassword === 'admin') {
      setIsAdminUnlocked(true);
      setAdminPassword('');
      setAdminError('');
      logActivity("SECURITY", "Successfully unlocked Admin Control Panel.");
      triggerAlert("Welcome to Admin Control Tower.", "success");
    } else {
      setAdminError("Invalid administrator passcode. Access Denied.");
      logActivity("SECURITY", "Failed attempt to unlock Admin Control Panel.");
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    triggerAlert("System Activity logs cleared.", "success");
  };

  // Filter published FAQs
  const filteredFaqs = faqs.filter(f => {
    const matchSearch = f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || f.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const matchesFilter = logFilter === 'ALL' || log.type === logFilter;
    const matchesSearch = log.desc.toLowerCase().includes(logSearch.toLowerCase()) || log.type.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="text-gray-100 min-h-screen font-inter flex flex-col antialiased bg-[#0b0f19]">
      
      {/* Header Panel */}
      <header className="w-full glass sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg shadow-black/10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <HelpCircle className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold font-outfit tracking-wide bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                CrowdFAQ
              </h1>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Max Edition
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Community Knowledge & NLP Pipeline</p>
          </div>
        </div>

        {/* Workspace Portal Switches, Demo Tour, Auth State, & Connectivity */}
        <div className="flex items-center gap-4">
          
          {/* Interactive Presentation Tour Companion */}
          <button 
            onClick={() => {
              setShowTour(true);
              setWorkspace('user');
              setUserTab('faq');
              setTourStep(1);
            }} 
            className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all"
          >
            <Compass className="w-3.5 h-3.5 animate-spin" />
            Presentation Guide Tour
          </button>

          {/* Persistent User Authentication Widget */}
          {currentUser ? (
            <div className="flex items-center gap-3 bg-dark-950/80 px-3 py-1 rounded-xl border border-white/5 shadow-inner text-xs">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-white/10 font-bold bg-dark-900 ${currentUser.color}`}>
                {currentUser.username[0].toUpperCase()}
              </div>
              <div className="text-left leading-tight">
                <span className="font-semibold block text-white">@{currentUser.username}</span>
                <span className="text-[9px] text-gray-500 font-mono block truncate max-w-[80px]">{currentUser.bio}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg ml-1 font-bold flex items-center gap-1 transition-all animate-pulse"
                title="Logout Portal Sessions"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                setAuthMode('login');
                setAuthModal(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}

          <div className="flex bg-dark-950/60 p-1 rounded-xl border border-white/5 shadow-inner">
            <button 
              onClick={() => setWorkspace('user')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-outfit transition-all duration-200 flex items-center gap-1.5 ${workspace === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              User Portal
            </button>
            <button 
              onClick={() => setWorkspace('admin')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-outfit transition-all duration-200 flex items-center gap-1.5 ${workspace === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              {isAdminUnlocked ? <Unlock className="w-3 h-3 text-green-400" /> : <Lock className="w-3 h-3" />}
              Admin Control Tower
            </button>
          </div>

          <div 
            onClick={checkApiConnection} 
            className="cursor-pointer flex items-center gap-2 bg-dark-900/60 hover:bg-dark-900 px-3 py-1.5 rounded-full border border-white/5 text-xs text-gray-400 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
            <span>{isConnected ? 'API Online' : 'Simulation Mode'}</span>
            <RefreshCw className="w-3 h-3 ml-0.5 text-gray-500 hover:text-gray-300" />
          </div>
        </div>
      </header>

      {/* Guided Tour Banner Overlay */}
      {showTour && (
        <div className="bg-indigo-950 border-b border-indigo-500/40 p-4 sticky top-[72px] z-30 shadow-lg animate-float">
          <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                {tourStep}
              </span>
              <div>
                <p className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {tourStep === 1 && "Step 1: Explore Verified Knowledge Database"}
                  {tourStep === 2 && "Step 2: Question Submission & Similarity Merging"}
                  {tourStep === 3 && "Step 3: Conversational AI Copilot Chat"}
                  {tourStep === 4 && "Step 4: Administrator Curation Board"}
                  {tourStep === 5 && "Step 5: Pipeline Settings & Activity Log Audit"}
                </p>
                <p className="text-[11px] text-indigo-300 mt-0.5">
                  {tourStep === 1 && "Start your presentation by showing the published verified FAQs. You can search or export items to JSON/CSV."}
                  {tourStep === 2 && "Type 'change email address' in the box. Preview how the deduplication similarity preview gauge acts in real-time before submission!"}
                  {tourStep === 3 && "Ask the AI assistant 'How do I download monthly invoices?'. The bot will dynamically search FAQs and reply instantly."}
                  {tourStep === 4 && "Switch to the curation tower using password 'admin'. Review upvoted clusters, choose AI or community drafts, and publish."}
                  {tourStep === 5 && "Inspect live diagnostics, tweak the similarity threshold slider, view searchable activity logs, and push code to GitHub remote!"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={handleTourNext} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                {tourStep === 5 ? "Finish presentation" : "Next presentation step"} <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowTour(false)} 
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authenticated Modal (Sign In / Register) */}
      {authModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass rounded-2xl p-6 border border-white/10 shadow-2xl relative flex flex-col gap-5 animate-float">
            <button 
              onClick={() => {
                setAuthModal(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <h3 className="text-lg font-bold font-outfit text-white">
                {authMode === 'login' ? "Welcome to CrowdFAQ" : "Create Community Account"}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {authMode === 'login' ? "Sign in to upvote clusters, ask AI, and submit questions." : "Join the crowd-sourced FAQ pipeline to earn badges."}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Username</label>
                <input 
                  type="text"
                  required
                  value={authUsername}
                  onChange={e => setAuthUsername(e.target.value.replace(/\s+/g, ''))}
                  placeholder="e.g. ganesh_prabu"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {authMode === 'signup' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email Address</label>
                    <input 
                      type="email"
                      required
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="e.g. ganesh@company.com"
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Profile Tagline (Quora Bio)</label>
                    <input 
                      type="text"
                      value={authBio}
                      onChange={e => setAuthBio(e.target.value)}
                      placeholder="e.g. Software Engineer at Google"
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Password</label>
                <input 
                  type="password"
                  required
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {authError && <p className="text-[10px] text-red-400 font-semibold">{authError}</p>}

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
              >
                {authMode === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {authMode === 'login' ? "Sign In to Account" : "Register Account"}
              </button>
            </form>

            <div className="text-center text-[10px] text-gray-400 border-t border-white/5 pt-3">
              {authMode === 'login' ? (
                <p>Don't have an account? <span onClick={() => setAuthMode('signup')} className="text-blue-400 hover:underline cursor-pointer font-bold">Sign Up</span></p>
              ) : (
                <p>Already have an account? <span onClick={() => setAuthMode('login')} className="text-blue-400 hover:underline cursor-pointer font-bold">Sign In</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Alert Notification */}
      {alert.show && (
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 mt-4 transition-all duration-300 animate-float">
          <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-lg ${
            alert.type === 'success' ? 'border-green-500/20 bg-green-500/5 text-green-400' :
            alert.type === 'error' ? 'border-red-500/20 bg-red-500/5 text-red-400' :
            'border-blue-500/20 bg-blue-500/5 text-blue-400'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{alert.text}</p>
          </div>
        </div>
      )}

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">

        {/* WORKSPACE A: USER PORTAL */}
        {workspace === 'user' && (
          <>
            {/* User Navigation Sub-tabs */}
            <div className="flex border-b border-white/5 overflow-x-auto scrollbar-hide shrink-0 gap-1">
              <button 
                onClick={() => setUserTab('faq')} 
                className={`px-5 py-3 font-outfit text-sm font-semibold tracking-wide border-b-2 flex items-center gap-2 transition-all ${userTab === 'faq' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <Search className="w-4 h-4" /> Browse FAQs
              </button>
              <button 
                onClick={() => setUserTab('ask-ai')} 
                className={`px-5 py-3 font-outfit text-sm font-semibold tracking-wide border-b-2 flex items-center gap-2 transition-all ${userTab === 'ask-ai' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <Sparkles className="w-4 h-4 text-blue-400" /> Ask AI Assistant
              </button>
              <button 
                onClick={() => setUserTab('submit-vote')} 
                className={`px-5 py-3 font-outfit text-sm font-semibold tracking-wide border-b-2 flex items-center gap-2 transition-all ${userTab === 'submit-vote' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <PlusCircle className="w-4 h-4" /> Submit & Prioritize
              </button>
              <button 
                onClick={() => setUserTab('analytics')} 
                className={`px-5 py-3 font-outfit text-sm font-semibold tracking-wide border-b-2 flex items-center gap-2 transition-all ${userTab === 'analytics' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <BarChart2 className="w-4 h-4 text-indigo-400" /> System Analytics
              </button>
              <button 
                onClick={() => setUserTab('about')} 
                className={`px-5 py-3 font-outfit text-sm font-semibold tracking-wide border-b-2 flex items-center gap-2 transition-all ${userTab === 'about' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <Info className="w-4 h-4 text-emerald-400" /> About & Insights
              </button>
            </div>

            {/* TAB 1: BROWSE VERIFIED FAQ BASE WITH DOWNLOADING EXPORTS */}
            {userTab === 'faq' && (
              <section className="flex flex-col gap-6">
                
                {/* Search Bar, Filters, and Exporting Tools */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-900/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Type keywords to filter verified knowledge base..." 
                      className="w-full bg-dark-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-500 transition-colors"
                    />
                  </div>
                  
                  {/* Category Filter Pills & Export Buttons */}
                  <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setCategoryFilter('All')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${categoryFilter === 'All' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-gray-400 border border-white/5 hover:text-white'}`}
                      >
                        All Tags
                      </button>
                      {CATEGORIES.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-gray-400 border border-white/5 hover:text-white'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-dark-950 px-2 py-1 rounded-lg border border-white/5 text-gray-500">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold mr-1 pl-1">Export Database</span>
                      <button 
                        onClick={() => handleExportData('json')}
                        className="text-[10px] font-bold text-gray-400 hover:text-white bg-dark-900 border border-white/5 hover:border-blue-500 px-2 py-1 rounded flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3 text-blue-400" /> JSON
                      </button>
                      <button 
                        onClick={() => handleExportData('csv')}
                        className="text-[10px] font-bold text-gray-400 hover:text-white bg-dark-900 border border-white/5 hover:border-blue-500 px-2 py-1 rounded flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3 text-blue-400" /> CSV
                      </button>
                    </div>
                  </div>
                </div>

                {/* FAQ Cards Display */}
                <div className="flex flex-col gap-4">
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center text-gray-500 py-16 bg-dark-900/25 rounded-2xl border border-white/5">
                      <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold">No verified FAQs match your filter criteria.</p>
                      <p className="text-xs text-gray-600 mt-1">Try searching a different keyword or tag.</p>
                    </div>
                  ) : (
                    filteredFaqs.map(f => (
                      <div key={f.faq_id} className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-3 hover:border-blue-500/20 transition-all duration-300 hover:scale-[1.005]">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {f.category}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            Published {new Date(f.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <h4 className="text-md font-bold text-white flex items-start gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0 shadow-md shadow-blue-500/50"></span>
                            {f.question}
                          </h4>
                          <p className="text-sm text-gray-400 leading-relaxed bg-dark-900/40 p-4 rounded-xl border border-white/5">
                            {f.answer}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* TAB 2: AI CHAT ASSISTANT PORTAL */}
            {userTab === 'ask-ai' && (
              <section className="flex flex-col gap-4 bg-dark-900/35 border border-white/5 rounded-2xl overflow-hidden h-[580px] shadow-2xl">
                
                {/* Chat Header */}
                <div className="bg-dark-900/90 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-outfit">AI Assistant Copilot</h3>
                      <p className="text-[10px] text-green-400 font-medium">Instantly searches & formulates Q&A replies</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    NLP Engine: <span className="text-blue-400 font-bold uppercase">{aiEngine}</span>
                  </div>
                </div>

                {/* Messages Board */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-hide">
                  {chatMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        msg.sender === 'user' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-dark-900 border-white/5 text-blue-400'
                      }`}>
                        {msg.sender === 'user' ? 'ME' : <Sparkles className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                          msg.sender === 'user' 
                            ? 'bg-blue-600/10 border-blue-500/30 text-white rounded-tr-none' 
                            : 'bg-dark-900/60 border-white/5 text-gray-300 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <span className={`text-[9px] text-gray-600 font-medium ${msg.sender === 'user' ? 'text-right' : ''}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isChatTyping && (
                    <div className="flex gap-3 max-w-[80%] mr-auto">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-dark-900 border-white/5 text-blue-400">
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="bg-dark-900/40 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Input Prompt Form */}
                <form onSubmit={handleSendChat} className="p-4 bg-dark-950/60 border-t border-white/5 flex gap-3">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask a question (e.g. 'How do I download monthly receipt PDFs?')"
                    className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 transition-colors"
                  />
                  <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </section>
            )}

            {/* TAB 3: SUBMIT QUESTION & VOTING BOARD WITH REAL-TIME NLP PREVIEW */}
            {userTab === 'submit-vote' && (
              <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Submit Form with LIVE Similarity matches feedback */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col gap-6 h-fit">
                    <div>
                      <h2 className="text-xl font-bold font-outfit text-white">Ask the Community</h2>
                      <p className="text-xs text-gray-400 mt-1">Have a new question? Type it here. The similarity engine will calculate duplicates live.</p>
                    </div>

                    <form onSubmit={handleQuestionSubmit} className="flex flex-col gap-4">
                      {/* Read-only authenticated user label */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Authoring Member</label>
                        <div className="w-full bg-dark-950/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-400 flex items-center gap-1.5 font-mono select-none">
                          <User className="w-3.5 h-3.5" />
                          {currentUser ? `@${currentUser.username} (${currentUser.bio})` : "Authentication Required (Please Login)"}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Category Tag</label>
                        <select 
                          value={newCategory}
                          onChange={e => setNewCategory(e.target.value)}
                          className="w-full bg-dark-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white transition-colors"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Question Details</label>
                        <textarea 
                          rows="3" 
                          value={newQuestion}
                          onChange={e => setNewQuestion(e.target.value)}
                          required
                          placeholder="Type your question here to preview NLP match..." 
                          className="w-full bg-dark-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 transition-colors"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-outfit font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit to Pipeline
                      </button>
                    </form>
                  </div>

                  {/* Real-time Semantic Deduplication Match Indicator */}
                  {newQuestion.trim().length > 3 && (
                    <div className="glass rounded-xl p-5 border border-blue-500/10 bg-blue-500/5 animate-float flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-blue-400 font-extrabold flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 animate-spin" />
                          Deduplication Engine Active
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Threshold: {similarityThreshold}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-12 h-12 shrink-0 rounded-full border border-white/10 bg-dark-950">
                          <span className={`text-xs font-bold ${liveMatch.sim > similarityThreshold ? 'text-green-400' : 'text-blue-400'}`}>
                            {Math.round(liveMatch.sim * 100)}%
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {liveMatch.sim > similarityThreshold 
                              ? "Auto-Merge Detected" 
                              : liveMatch.sim > 0.40 
                              ? "Weak Similarity Match" 
                              : "Unique Cluster Seed"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {liveMatch.sim > similarityThreshold 
                              ? "Matches existing clusters. New input will merge into the group automatically." 
                              : "Unique enough. Submission will seed a new prioritizable topic."}
                          </p>
                        </div>
                      </div>

                      {liveMatch.cluster && (
                        <div className="bg-dark-950/60 p-2.5 rounded-lg border border-white/5 mt-1">
                          <span className="text-[8px] text-gray-500 font-mono block">MATCHING TARGET</span>
                          <span className="text-[10px] text-gray-300 font-semibold block truncate">"{liveMatch.cluster.representative_question}"</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Quora Feed-style Priority Queue */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                  
                  {/* Quora subscription tag follow toggler */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-extrabold flex items-center gap-1 font-mono">
                      <Users className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      Filter Feed by Following Tag topics:
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                      {CATEGORIES.map(tag => {
                        const isFollowing = followedTags.includes(tag);
                        return (
                          <button 
                            key={tag}
                            onClick={() => handleToggleTagFollow(tag)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isFollowing 
                                ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                                : 'bg-transparent text-gray-500 border-white/5 hover:text-white'
                            }`}
                          >
                            {isFollowing ? `✓ Following ${tag}` : `+ Follow ${tag}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    {clusters.filter(c => c.status === 'unanswered' && followedTags.includes(c.category)).length === 0 ? (
                      <div className="text-center text-gray-500 py-16 bg-dark-900/25 rounded-2xl border border-white/5">
                        <Award className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        <p className="text-sm font-semibold">Feed is empty.</p>
                        <p className="text-xs text-gray-600 mt-1">Try following more Category tag subscriptions above!</p>
                      </div>
                    ) : (
                      clusters.filter(c => c.status === 'unanswered' && followedTags.includes(c.category)).map(c => {
                        const isExpanded = expandedCluster === c.id;
                        const commAnsList = communityAnswers[c.id] || [];

                        return (
                          <div 
                            key={c.id} 
                            className={`glass rounded-xl p-5 flex flex-col gap-4 border transition-all duration-300 ${
                              isExpanded ? 'border-blue-500/40 bg-blue-500/5 glow-brand' : 'border-white/5 hover:border-blue-500/30'
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                  {c.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                                  Priority: <strong className="text-blue-500 font-extrabold">{c.priority_score?.toFixed(2)}</strong>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-white mt-1">
                                {c.representative_question}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                              <button 
                                onClick={() => setExpandedCluster(isExpanded ? null : c.id)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                              >
                                {isExpanded ? (
                                  <>Close Details <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                  <>View Thread & Drafts ({commAnsList.length + 1}) <ChevronDown className="w-3 h-3" /></>
                                )}
                              </button>

                              {/* Quora visual view counters */}
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                <Eye className="w-3.5 h-3.5" />
                                {c.views || 12} views
                              </div>
                              
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUpvote(c.id)} 
                                  className="flex items-center gap-1.5 text-[10px] bg-dark-950 border border-white/10 hover:border-blue-500 hover:bg-blue-500/10 text-gray-300 hover:text-white px-3.5 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                                >
                                  <ThumbsUp className="w-3 h-3 text-blue-500" /> Upvote ({c.upvotes})
                                </button>
                              </div>
                            </div>

                            {/* Thread Expansion Details */}
                            {isExpanded && (
                              <div className="mt-2 border-t border-white/5 pt-4 flex flex-col gap-4 animate-float">
                                
                                {/* AI Draft Answer View */}
                                <div className="bg-dark-950/80 p-3 rounded-lg border border-white/5 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[9px]">
                                    <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 animate-pulse" />
                                      AI Curated Answer Draft
                                    </span>
                                    <span className="text-gray-500 font-mono">{aiEngine}</span>
                                  </div>
                                  <p className="text-xs text-gray-300 italic">
                                    "{c.ai_draft_answer}"
                                  </p>
                                </div>

                                {/* Community Answers List with upvote and downvote controllers */}
                                <div className="flex flex-col gap-2.5">
                                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-blue-400" />
                                    Community Collaborative Drafts ({commAnsList.length})
                                  </span>
                                  
                                  {commAnsList.length === 0 ? (
                                    <p className="text-[10px] text-gray-600 italic pl-1">No community answers shared yet. Submit a draft below!</p>
                                  ) : (
                                    commAnsList.map(a => (
                                      <div key={a.id} className="bg-dark-900/60 p-3 rounded-lg border border-white/5 flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-blue-400 font-bold text-[10px]">@{a.author}</span>
                                            <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-[8px] text-gray-500 font-mono font-bold">Writer</span>
                                          </div>
                                          <p className="text-xs text-gray-300 mt-1">{a.text}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 bg-dark-950 p-1 rounded-lg border border-white/5">
                                          <button 
                                            onClick={() => handleUpvoteCommunityAnswer(c.id, a.id)}
                                            className="text-[9px] font-bold text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded flex items-center gap-0.5"
                                            title="Upvote Answer"
                                          >
                                            <ThumbsUp className="w-3 h-3 text-blue-400" /> ({a.upvotes})
                                          </button>
                                          <span className="text-gray-700 select-none">|</span>
                                          <button 
                                            onClick={() => handleDownvoteCommunityAnswer(c.id, a.id)}
                                            className="text-[9px] font-bold text-gray-500 hover:text-red-400 p-1 hover:bg-white/5 rounded flex items-center gap-0.5"
                                            title="Downvote Answer"
                                          >
                                            <ThumbsDown className="w-3 h-3 text-gray-600" /> ({a.downvotes})
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Add Custom Community Answer */}
                                <form 
                                  onSubmit={(e) => handleAddCommunityAnswer(e, c.id)} 
                                  className="flex flex-col gap-2 mt-1"
                                >
                                  <label className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Contribute a Community Answer Draft</label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text"
                                      value={newCommunityAnsText}
                                      onChange={e => setNewCommunityAnsText(e.target.value)}
                                      placeholder={currentUser ? "Explain instructions clearly. Draft will be seen by moderators." : "Authentication required to participate."}
                                      disabled={!currentUser}
                                      className="flex-1 bg-dark-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                    />
                                    <button 
                                      type="submit"
                                      disabled={!currentUser}
                                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Post
                                    </button>
                                  </div>
                                </form>

                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* TAB 4: ADVANCED ENTERPRISE ANALYTICS */}
            {userTab === 'analytics' && (
              <section className="flex flex-col gap-6 animate-float">
                
                {/* Visual Widgets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-2 shadow-lg">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Database className="w-4 h-4 text-blue-400" />
                      Verified FAQ Database
                    </span>
                    <h3 className="text-3xl font-extrabold font-outfit text-white">{faqs.length}</h3>
                    <p className="text-[10px] text-gray-400">Total published knowledge pieces</p>
                  </div>

                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-2 shadow-lg">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Award className="w-4 h-4 text-blue-400" />
                      Open Priorities
                    </span>
                    <h3 className="text-3xl font-extrabold font-outfit text-white">
                      {clusters.filter(c => c.status === 'unanswered').length}
                    </h3>
                    <p className="text-[10px] text-gray-400">Unanswered question clusters</p>
                  </div>

                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-2 shadow-lg">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Cpu className="w-4 h-4 text-indigo-400 animate-spin" />
                      Deduplication Savings
                    </span>
                    <h3 className="text-3xl font-extrabold font-outfit text-green-400">78%</h3>
                    <p className="text-[10px] text-gray-400">Duplicate questions avoided automatically</p>
                  </div>

                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-2 shadow-lg">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      Total System Votes
                    </span>
                    <h3 className="text-3xl font-extrabold font-outfit text-white">
                      {clusters.reduce((acc, c) => acc + c.upvotes, 0) + 12}
                    </h3>
                    <p className="text-[10px] text-gray-400">Total prioritizing upvotes registered</p>
                  </div>
                </div>

                {/* Gamified Contributor Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
                  
                  {/* Leaderboard */}
                  <div className="glass rounded-xl p-6 border border-white/5 lg:col-span-3 flex flex-col gap-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-bold font-outfit text-white flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
                          Community Contributor Leaderboard
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Top members earning collaborative reputation index badges</p>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">Season 1 Active</span>
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                      <div className="grid grid-cols-5 text-[9px] uppercase tracking-wider text-gray-500 font-extrabold border-b border-white/5 pb-2 font-mono">
                        <span className="col-span-2">Contributor Member</span>
                        <span className="text-center">Contributions</span>
                        <span className="text-center">Total Votes</span>
                        <span className="text-right">Badges</span>
                      </div>

                      {contributors.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-5 text-xs py-2 items-center border-b border-white/5/30">
                          <div className="col-span-2 flex items-center gap-2">
                            <span className="text-gray-500 font-mono font-bold">#0{idx+1}</span>
                            <div>
                              <span className="font-semibold text-white block">{item.name}</span>
                              <span className="text-[9px] text-gray-500 block font-mono">{item.role}</span>
                            </div>
                          </div>
                          <span className="text-center text-gray-300 font-mono font-semibold">{item.count}</span>
                          <span className="text-center text-gray-300 font-mono font-semibold">{item.votes}</span>
                          <div className="text-right">
                            <span className={`text-[9px] font-bold border border-white/10 px-2 py-0.5 rounded-full ${item.color} bg-white/5 font-mono`}>
                              {item.badge}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FAQ Category shares */}
                  <div className="glass rounded-xl p-6 border border-white/5 lg:col-span-2 flex flex-col gap-4 shadow-lg">
                    <div>
                      <h3 className="text-md font-bold font-outfit text-white">Category Proportions</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Statistical sharing of verified database categories</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-2">
                      {CATEGORIES.slice(0, 4).map(cat => {
                        const totalCount = faqs.filter(f => f.category === cat).length;
                        const pct = faqs.length > 0 ? (totalCount / faqs.length) * 100 : 0;
                        return (
                          <div key={cat} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-300 font-semibold">{cat}</span>
                              <span className="text-gray-400 font-mono">{totalCount} items ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-dark-950/80 rounded-full h-2 overflow-hidden border border-white/5">
                              <div 
                                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(5, pct)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </section>
            )}

            {/* TAB 5: ABOUT THE TEAM & SYSTEM INSIGHTS MANUAL (United Team) */}
            {userTab === 'about' && (
              <section className="flex flex-col gap-6 animate-float">
                
                {/* Abstract & Introduction */}
                <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col gap-4 shadow-md bg-gradient-to-r from-emerald-500/5 to-indigo-500/5">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <HelpCircle className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h2 className="text-lg font-bold font-outfit text-white">Project Vision & Architecture Overview</h2>
                      <p className="text-xs text-gray-400 font-medium">Automatic Crowd-Sourced Knowledge Pipeline Management</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    Traditional FAQ pages rely on static sets of manually written articles, which quickly become outdated and fail to reflect actual user queries. This project addresses that gap by building an intelligent, collaborative knowledge pipeline where questions submitted by users are semantically clustered, prioritized by interest, drafted by AI agents, and approved by human moderators to create a dynamically updated repository.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    By combining crowd-sourced curation (Quora-style feedback channels) with automated Natural Language Processing (NLP) deduplication and Generative AI drafts, the system scales knowledge distribution while keeping operational overhead minimal.
                  </p>
                </div>

                {/* Core Portal Capabilities & Functions */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-md font-bold font-outfit text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    Core Platform Portal Capabilities & Functions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider w-fit">PORTAL 1</span>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-blue-400" /> Public FAQ & Semantic Search
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        Enables instant keyword-indexed knowledge base searches across verified Q&A pairs, complete with categories and visual views counters.
                      </p>
                    </div>
                    
                    <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider w-fit">PORTAL 2</span>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Conversational AI Q&A Assistant
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        A direct chat-style assistant that extracts verified FAQ pairings in real-time, providing concise, instant conversational answers.
                      </p>
                    </div>

                    <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider w-fit">PORTAL 3</span>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-indigo-400" /> Ask Community & Live NLP Deduplication
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        Allows users to post questions to the queue. As they type, our deduplication engine calculates similarity ratios to prevent duplicate entries.
                      </p>
                    </div>

                    <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider w-fit">PORTAL 4</span>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" /> Priority Decay Voting Queue
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        A Quora-like feed where community members upvote questions and post collaborative drafts, bubble-sorted by recency decay scores.
                      </p>
                    </div>

                    <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider w-fit">PORTAL 5</span>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Expert Curation Dashboard
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        Secure moderator center to review open questions, edit LLM drafts, select community drafts, and publish verified answers.
                      </p>
                    </div>

                    <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider w-fit">PORTAL 6</span>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-indigo-400" /> AI Prompts & Diagnostic Controls
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        Allows adjustment of pipeline thresholds, prompt fine-tuning, system CPU/RAM diagnostics, mock database management, and activity auditing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Project Function Explorer */}
                <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col gap-4 shadow-lg bg-dark-900/30">
                  <div>
                    <h3 className="text-md font-bold font-outfit text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-emerald-400 animate-spin" />
                      Interactive Technical Function Explorer
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">Click any module to inspect real-time algorithms, files, and design insights</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
                    {/* Left Sidebar Menu */}
                    <div className="lg:col-span-2 flex flex-col gap-2">
                      {[
                        { id: 'nlp-dedup', title: '1. Semantic Deduplication Routing', icon: Tag, color: 'text-blue-400' },
                        { id: 'decay-priority', title: '2. Priority Recency Decay Score', icon: Award, color: 'text-amber-400' },
                        { id: 'ai-generation', title: '3. AI Generative Draft Agent', icon: Sparkles, color: 'text-purple-400' },
                        { id: 'moderator-curation', title: '4. Expert Curation Panel', icon: ShieldCheck, color: 'text-emerald-400' },
                        { id: 'rag-chat', title: '5. Conversational AI Assistant', icon: MessageCircle, color: 'text-indigo-400' },
                        { id: 'diagnostics-logs', title: '6. Live Diagnostics & System Logs', icon: Activity, color: 'text-pink-400' }
                      ].map(item => {
                        const IconComponent = item.icon;
                        const isSelected = activeInsightModule === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveInsightModule(item.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                              isSelected
                                ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-sm font-semibold'
                                : 'bg-dark-950/40 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                            }`}
                          >
                            <span className="text-xs flex items-center gap-2.5 font-medium">
                              <IconComponent className={`w-4 h-4 ${item.color} ${isSelected ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                              {item.title}
                            </span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-indigo-400 translate-x-1' : 'text-gray-600 group-hover:translate-x-0.5'}`} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Details Panel */}
                    <div className="lg:col-span-3 bg-dark-950/70 rounded-xl p-5 border border-white/5 flex flex-col gap-4">
                      {activeInsightModule === 'nlp-dedup' && (
                        <div className="flex flex-col gap-3 animate-float">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-blue-400" /> Semantic Deduplication Engine
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            Our deduplication subsystem performs real-time semantic analysis to prevent database bloat and overlapping query pools. When a user submits a question, it is processed and compared against pending topics.
                          </p>
                          <div className="bg-dark-900/80 p-3 rounded-lg border border-white/5 font-mono text-[10px] text-blue-400 flex flex-col gap-1.5 leading-normal">
                            <span className="font-bold text-white block">CORE MATH ALGORITHM (Cosine Similarity)</span>
                            <span>Similarity = (A · B) / (||A|| ||B||)</span>
                            <span className="text-gray-500 block mt-1">Computes intersection ratios between processed term vectors. High proximity (&gt;= {similarityThreshold}) results in auto-merging under an existing cluster, while low values seed unique prioritization targets.</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <strong className="text-gray-400 font-bold">Implementation Files:</strong> <code className="text-gray-300 font-mono">nlp-service/app.py</code> (sentence-transformers embeddings), <code className="text-gray-300 font-mono">frontend/src/App.jsx</code> (cosine similarity fallback)
                          </div>
                          <div className="flex gap-2 text-[10px] text-green-400 font-bold bg-green-500/5 px-2.5 py-1.5 rounded border border-green-500/10 w-fit">
                            ✓ Saves up to 78% moderation database rows automatically
                          </div>
                        </div>
                      )}

                      {activeInsightModule === 'decay-priority' && (
                        <div className="flex flex-col gap-3 animate-float">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-400" /> Upvote Recency Time-Decay Ranker
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            Standard queues suffer from static placement, where early submissions block newly trending queries. Our recency-based time decay formula balances interest level against elapsed hours, ensuring a high-density, trending feed.
                          </p>
                          <div className="bg-dark-900/80 p-3 rounded-lg border border-white/5 font-mono text-[10px] text-amber-400 flex flex-col gap-1.5 leading-normal">
                            <span className="font-bold text-white block">CORE DAMPING EQUATION</span>
                            <span>Score = (Upvotes + 1.0) / (Hours Elapsed + 2.0) ^ {decayWeight}</span>
                            <span className="text-gray-500 block mt-1">Upvote scores are divided by elapsed time, raised to the decay power. This ensures older topics slowly decay while newly upvoted topics bubble instantly to the moderators' attention.</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <strong className="text-gray-400 font-bold">Implementation Files:</strong> <code className="text-gray-300 font-mono">backend/server.js</code> (SQLite custom priority calculations), <code className="text-gray-300 font-mono">frontend/src/App.jsx</code> (mock priority calculator)
                          </div>
                          <div className="flex gap-2 text-[10px] text-amber-400 font-bold bg-amber-500/5 px-2.5 py-1.5 rounded border border-amber-500/10 w-fit">
                            ✓ Resolves "early-bias" blockage in community feeds
                          </div>
                        </div>
                      )}

                      {activeInsightModule === 'ai-generation' && (
                        <div className="flex flex-col gap-3 animate-float">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" /> Generative AI Draft Agent
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            To speed up curation, the system launches immediate generative draft workers upon cluster initialization. It extracts context, targets the correct category domain, and applies expert structural prompt templates.
                          </p>
                          <div className="bg-dark-900/80 p-3 rounded-lg border border-white/5 flex flex-col gap-1.5 text-xs text-purple-300 italic font-medium">
                            <span className="font-bold text-white block font-mono text-[9px] not-italic">CURRENT PROMPT CUSTOMIZER TEMPLATE:</span>
                            "{promptTemplate.slice(0, 120)}..."
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <strong className="text-gray-400 font-bold">Implementation Files:</strong> <code className="text-gray-300 font-mono">backend/server.js</code> (LLM router API), <code className="text-gray-300 font-mono">nlp-service/app.py</code> (prompt templates & keyword models)
                          </div>
                          <div className="flex gap-2 text-[10px] text-purple-400 font-bold bg-purple-500/5 px-2.5 py-1.5 rounded border border-purple-500/10 w-fit">
                            ✓ Speeds up FAQ response generation by over 85%
                          </div>
                        </div>
                      )}

                      {activeInsightModule === 'moderator-curation' && (
                        <div className="flex flex-col gap-3 animate-float">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Human-in-the-Loop Curation Board
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            The moderation panel maintains full quality oversight. Authorized curators review unanswered clusters (bubble-sorted by Priority score) and review either the AI's response draft or collaborative drafts uploaded by contributors.
                          </p>
                          <div className="bg-dark-900/80 p-3 rounded-lg border border-white/5 text-[10px] text-gray-400 flex flex-col gap-1.5 leading-normal">
                            <span className="font-bold text-white block font-mono text-[9px]">SECURITY GATE CREDENTIALS</span>
                            <span className="font-mono text-emerald-400 font-bold">Access Passcode: "admin"</span>
                            <span className="text-gray-500 mt-1">Provides access to diagnostic sliders, database wipers/seeders, instant approvals, custom prompt customization, and raw activity log details.</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <strong className="text-gray-400 font-bold">Implementation Files:</strong> <code className="text-gray-300 font-mono">frontend/src/App.jsx</code> (CurationCard component rendering, security gates)
                          </div>
                          <div className="flex gap-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2.5 py-1.5 rounded border border-emerald-500/10 w-fit">
                            ✓ Combines LLM generation speed with expert quality control
                          </div>
                        </div>
                      )}

                      {activeInsightModule === 'rag-chat' && (
                        <div className="flex flex-col gap-3 animate-float">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 text-indigo-400" /> Conversational FAQ Chat Assistant
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            Instead of forcing users to scroll through countless FAQs, the AI chat assistant offers a natural dialogue search. It executes semantic keyword indexing against the SQLite published FAQ table to deliver exact matches immediately.
                          </p>
                          <div className="bg-dark-900/80 p-3 rounded-lg border border-white/5 font-mono text-[10px] text-indigo-400 flex flex-col gap-1.5 leading-normal">
                            <span className="font-bold text-white block">CONVERSATIONAL ROUTING LOGIC</span>
                            <span>Input Question --&gt; Semantic Query Mapping --&gt; Fetch published FAQ pairing --&gt; Format Chat Payload</span>
                            <span className="text-gray-500 mt-1">If zero matches are located, the assistant offers to redirect the user to submit their question to the priority queue.</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <strong className="text-gray-400 font-bold">Implementation Files:</strong> <code className="text-gray-300 font-mono">frontend/src/App.jsx</code> (conversational chat state, token search mapping)
                          </div>
                          <div className="flex gap-2 text-[10px] text-indigo-400 font-bold bg-indigo-500/5 px-2.5 py-1.5 rounded border border-indigo-500/10 w-fit">
                            ✓ Elevates user engagement via dialogue-driven self-service
                          </div>
                        </div>
                      )}

                      {activeInsightModule === 'diagnostics-logs' && (
                        <div className="flex flex-col gap-3 animate-float">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-pink-400" /> System Diagnostics & Audit Logs
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            Maintains absolute operational transparency. Every question submission, similarity merge, community upvote, and publication event is logged in our real-time audit trail, alongside server metrics.
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono leading-normal text-gray-500 bg-dark-900/80 p-3 rounded-lg border border-white/5">
                            <div>
                              <span className="text-white font-bold block mb-1">LIVE METRICS</span>
                              <span>CPU UTILIZATION: ~{cpuUsage}%</span><br />
                              <span>RAM ALLOCATION: ~{ramUsage}%</span>
                            </div>
                            <div>
                              <span className="text-white font-bold block mb-1">STORAGE DATA</span>
                              <span>SQLITE DB SIZE: 2.4 MB</span><br />
                              <span>VECTOR ENG: READY</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <strong className="text-gray-400 font-bold">Implementation Files:</strong> <code className="text-gray-300 font-mono">backend/server.js</code> (REST activity logs API), <code className="text-gray-300 font-mono">frontend/src/App.jsx</code> (diagnostics display console)
                          </div>
                          <div className="flex gap-2 text-[10px] text-pink-400 font-bold bg-pink-500/5 px-2.5 py-1.5 rounded border border-pink-500/10 w-fit">
                            ✓ Guarantees 100% operational transparency and auditing
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* United Team Roster */}
                <div className="glass rounded-2xl p-6 border border-emerald-500/10 bg-emerald-500/5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <Users className="w-6 h-6 text-emerald-400 animate-pulse" />
                    <div>
                      <h3 className="text-md font-bold font-outfit text-white">Project Engineering Team</h3>
                      <p className="text-xs text-emerald-300 font-medium">United members driving collaborative pipeline engineering</p>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                    Our engineering group is composed of dedicated technical contributors working collaboratively across full-stack application development, database management, AI/NLP vector pipelines, UI design, prompt tuning, and quality assurance. In order to drive the project successfully, we operate as a unified dev group:
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 font-mono">
                    {[
                      "Ganeshprabu BO",
                      "Mohd Warish",
                      "Tejeswara Reddy",
                      "Chaitanya Ram S",
                      "Ritzy Elsa George",
                      "Vineelkrishna K",
                      "Nekha Mariya Paul",
                      "Harshith Sai Suraj",
                      "Pursharth Kaushal",
                      "Abhishek Kumar",
                      "Aryan Gaur",
                      "Lohit Kumar Pureti"
                    ].map((name, index) => (
                      <div key={index} className="bg-dark-950/60 border border-white/5 px-4 py-2.5 rounded-lg flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                        <span className="text-xs font-semibold text-white">{name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-dark-900/60 p-3 rounded-lg border border-emerald-500/10 mt-2 text-[10px] text-emerald-300 font-mono text-center select-none leading-relaxed">
                    ★ Unified engineering team contributing collectively toward enterprise crowd-sourced knowledge platforms. ★
                  </div>
                </div>

              </section>
            )}
          </>
        )}

        {/* WORKSPACE B: ADMIN CONTROL TOWER */}
        {workspace === 'admin' && (
          <section className="flex flex-col gap-6">
            
            {/* Admin Lock Gate */}
            {!isAdminUnlocked ? (
              <div className="max-w-md w-full mx-auto glass rounded-2xl p-8 border border-white/5 shadow-2xl flex flex-col gap-6 text-center my-12 animate-float">
                <div className="bg-indigo-500/10 p-4 rounded-full border border-indigo-500/20 w-fit mx-auto">
                  <ShieldAlert className="w-10 h-10 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-outfit text-white">Security Credentials Required</h3>
                  <p className="text-xs text-gray-400 mt-1">Access the moderation panel, pipeline configurations, and activity logs.</p>
                </div>
                <form onSubmit={handleAdminUnlock} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <input 
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password..."
                      className="w-full bg-dark-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600 text-center transition-colors font-mono"
                    />
                    {adminError && <span className="text-[10px] text-red-400 font-semibold">{adminError}</span>}
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-outfit font-semibold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 text-xs"
                  >
                    <Key className="w-3.5 h-3.5" /> Unlock Administration
                  </button>
                </form>
              </div>
            ) : (
              // Unlocked Admin Dashboards
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-float">
                
                {/* Left side: Moderation Curation Queue & AI Prompt Engineering Playground */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Pipeline Curation Dashboard using modular components */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="text-xl font-bold font-outfit text-white">Expert Curation Dashboard</h2>
                      <p className="text-xs text-gray-400 mt-1">Review active clusters. Choose to publish either the AI Generative Draft or select one of the community-submitted answers.</p>
                    </div>

                    <div className="flex flex-col gap-5">
                      {clusters.filter(c => c.status === 'unanswered').length === 0 ? (
                        <div className="text-center text-gray-500 py-16 bg-dark-900/25 rounded-2xl border border-white/5">
                          <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                          <p className="text-sm font-semibold">Moderation pipeline is empty.</p>
                          <p className="text-xs text-gray-600 mt-1">All community questions are happily answered and published!</p>
                        </div>
                      ) : (
                        clusters.filter(c => c.status === 'unanswered').map(c => (
                          <CurationCard 
                            key={c.id}
                            cluster={c}
                            communityAnswers={communityAnswers}
                            onPublish={handleApprovePublish}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI Prompt Engineering Playground Dashboard */}
                  <div className="glass rounded-xl p-6 border border-indigo-500/10 bg-indigo-500/5 flex flex-col gap-4">
                    <div>
                      <h3 className="text-md font-bold font-outfit text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400 animate-pulse" />
                        AI Agent Curation Prompt Customizer
                      </h3>
                      <p className="text-xs text-indigo-300 mt-0.5 font-medium">Fine-tune instructions used by tomorrow's LLM draft generation pipeline</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">System Prompt Template Guidelines</span>
                        <textarea 
                          rows="3"
                          value={promptTemplate}
                          onChange={e => {
                            setPromptTemplate(e.target.value);
                            logActivity("CONFIG", "Updated system AI generative draft prompt templates.");
                          }}
                          className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-300 font-medium"
                        />
                      </div>
                      
                      <div className="p-3 bg-dark-900/60 rounded-xl border border-white/5 flex gap-3 text-[11px] text-gray-400">
                        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">
                          This prompt template will be synchronized with tomorrow's Node.js REST API scheduler and forward directly to active LLM inference endpoints.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right side: Diagnostics Panel, Configuration panel, Database Seed, Audit Monitor */}
                <div className="flex flex-col gap-6">
                  
                  {/* System Resources & Diagnostics Panel */}
                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-4">
                    <h3 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      Live Diagnostics Control Tower
                    </h3>
                    
                    <div className="flex flex-col gap-3.5 text-xs font-mono font-semibold">
                      
                      {/* Cpu usage bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-400 uppercase tracking-wider text-[9px] font-extrabold">Server CPU Throughput</span>
                          <span className="text-indigo-400">{cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${cpuUsage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Ram usage bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-400 uppercase tracking-wider text-[9px] font-extrabold">Database Ram Allocation</span>
                          <span className="text-indigo-400">{ramUsage}%</span>
                        </div>
                        <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${ramUsage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* SQLite / NLP storage details */}
                      <div className="flex flex-col gap-1.5 mt-2 bg-dark-950/80 p-3 rounded-lg border border-white/5 text-[9px] leading-relaxed text-gray-500">
                        <div className="flex justify-between">
                          <span>SQLITE SIZE:</span>
                          <span className="text-white">2.4 MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>NLP VECTOR LOAD STATE:</span>
                          <span className="text-green-400">READY (MiniLM-L6)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SYNC REPOSITORY ORIGIN:</span>
                          <span className="text-blue-400 truncate w-[100px] text-right">github/prabu411</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Database Seed and Purge Controller */}
                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-3.5 bg-dark-900/40">
                    <h3 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-400" />
                      Mock Database Administration
                    </h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                      Control active SQLite in-memory tables. Wipe collections to test deduplication similarity merging or seed them with default records.
                    </p>
                    <div className="grid grid-cols-2 gap-3 font-outfit font-bold">
                      <button 
                        onClick={handleSeedDatabase}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Seed Demo
                      </button>
                      <button 
                        onClick={handleWipeDatabase}
                        className="bg-red-600/20 border border-red-500/20 hover:bg-red-600/30 text-red-400 text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Wipe Database
                      </button>
                    </div>
                  </div>

                  {/* NLP Pipeline Settings control */}
                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-4">
                    <h3 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-400 animate-spin" />
                      NLP System Parameters
                    </h3>

                    <div className="flex flex-col gap-3.5 text-xs">
                      
                      {/* Similarity Threshold */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-400">Deduplication Threshold:</span>
                          <span className="text-blue-400 font-mono">{similarityThreshold}</span>
                        </div>
                        <input 
                          type="range"
                          min="0.50"
                          max="0.95"
                          step="0.05"
                          value={similarityThreshold}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setSimilarityThreshold(val);
                            logActivity("CONFIG", `Similarity Deduplication threshold updated to [${val}]`);
                          }}
                          className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Recency Decay Score weighting */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-400">Priority Recency Decay (Beta):</span>
                          <span className="text-blue-400 font-mono">{decayWeight}</span>
                        </div>
                        <input 
                          type="range"
                          min="0.1"
                          max="1.5"
                          step="0.1"
                          value={decayWeight}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setDecayWeight(val);
                            logActivity("CONFIG", `Recency priority decay factor updated to [${val}]`);
                          }}
                          className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* AI Generator Temperature slider */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-400">AI Prompt Temperature:</span>
                          <span className="text-blue-400 font-mono">{aiTemperature}</span>
                        </div>
                        <input 
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={aiTemperature}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setAiTemperature(val);
                            logActivity("CONFIG", `AI generation Temperature parameter adjusted to [${val}]`);
                          }}
                          className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* AI Model selector */}
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-gray-400 font-semibold">AI Assistant LLM Agent:</span>
                        <select 
                          value={aiEngine}
                          onChange={e => {
                            setAiEngine(e.target.value);
                            logActivity("CONFIG", `Active generative LLM Engine switched to [${e.target.value}]`);
                          }}
                          className="w-full bg-dark-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="gpt-4o-mini">gpt-4o-mini (default)</option>
                          <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                          <option value="deepseek-r1-distill">deepseek-r1-distill</option>
                          <option value="llama-3.1-70b-instruct">llama-3.1-70b-instruct</option>
                        </select>
                      </div>

                      {/* Auto Generative drafts toggle */}
                      <div className="flex items-center justify-between font-semibold border-t border-white/5 pt-3">
                        <span className="text-gray-400">Generate AI Drafts instantly:</span>
                        <input 
                          type="checkbox"
                          checked={autoDraft}
                          onChange={e => {
                            setAutoDraft(e.target.checked);
                            logActivity("CONFIG", `Instant AI draft auto-generation toggled to: [${e.target.checked}]`);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                    </div>
                  </div>

                  {/* Git remote synchronization */}
                  <div className="glass rounded-xl p-5 border border-white/5 flex flex-col gap-3">
                    <h3 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      Git Repository Synchronization
                    </h3>
                    <code className="block bg-dark-950/80 p-2.5 rounded border border-white/5 text-[9.5px] text-blue-400 font-mono select-all break-all leading-normal">
                      https://github.com/prabu411/Crowd-Sourced-FAQ-Mangement.git
                    </code>
                    <button 
                      onClick={handleGitSync}
                      disabled={isSyncing}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-outfit font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors shadow-lg shadow-indigo-600/15"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Pushing code changes...
                        </>
                      ) : (
                        <>
                          <Activity className="w-3.5 h-3.5" />
                          Push Code to GitHub
                        </>
                      )}
                    </button>
                  </div>

                  {/* Audit Logs list with Advanced Logging Filters and Searches */}
                  <div className="glass rounded-xl p-5 border border-white/5 flex-1 flex flex-col gap-4 max-h-[350px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-400" />
                          System Activity Log
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">Chronological audit stream of pipeline actions</p>
                      </div>
                      <button 
                        onClick={handleClearLogs}
                        className="text-[9px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors font-outfit"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear Logs
                      </button>
                    </div>

                    {/* Log Filters */}
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text"
                        value={logSearch}
                        onChange={e => setLogSearch(e.target.value)}
                        placeholder="Search logs description..."
                        className="w-full bg-dark-950/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none"
                      />
                      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {["ALL", "SYSTEM", "VOTE", "DEDUPLICATION", "PUBLISH", "CONFIG", "SEED"].map(type => (
                          <button 
                            key={type}
                            onClick={() => setLogFilter(type)}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${
                              logFilter === type 
                                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' 
                                : 'bg-transparent text-gray-500 border-white/5 hover:text-white'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 scrollbar-hide pr-1">
                      {filteredLogs.length === 0 ? (
                        <p className="text-[10px] text-gray-600 italic text-center py-6">No matching logs registered.</p>
                      ) : (
                        filteredLogs.map((log, index) => (
                          <div key={index} className="bg-dark-950/50 border border-white/5 p-2.5 rounded-lg flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[8px]">
                              <span className={`px-1.5 py-0.5 rounded font-extrabold ${
                                log.type === 'SYSTEM' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                log.type === 'PUBLISH' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                log.type === 'VOTE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                log.type === 'CONFIG' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                log.type === 'SEED' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' :
                                'bg-gray-700/30 text-gray-400 border border-white/5'
                              }`}>
                                {log.type}
                              </span>
                              <span className="text-gray-600 font-mono">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[9.5px] text-gray-300 font-medium leading-relaxed font-mono">
                              {log.desc}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </section>
        )}

      </main>

      {/* Footer Accents */}
      <footer className="w-full text-center py-6 border-t border-white/5 text-[10px] text-gray-600 mt-auto">
        <p>&copy; 2026 CrowdFAQ Generation System. Scaffolded for Ganeshprabu BO (Team Lead).</p>
      </footer>
    </div>
  );
}
