import { useState, useEffect, useRef } from 'react'
import { 
  Phone, PhoneOff, Activity, ShieldCheck, Clock, 
  ChevronRight, AlertCircle, CheckCircle2, User, 
  MessageSquare, BarChart3, Database, Cpu, Globe,
  Settings, Search, MoreVertical, X, Check, RotateCcw,
  ShoppingCart, ListFilter, Users, History, LayoutDashboard,
  ShieldAlert, Tag
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API Configuration
const BACKEND_URL = 'http://localhost:8001'
const PIPELINE_URL = 'http://localhost:8000'
const AGENT_URL = 'http://localhost:4000'

interface Call {
  id: string
  phone_number: string
  status: string
  timestamp: string
  customer_name?: string
  language?: string
}

interface Product {
  id: string
  name: string
  price: number
  is_available: boolean
}

interface Escalation {
  id: string
  call_id: string
  reason: string
  resolved: boolean
  customer_name?: string
}

export default function App() {
  const [activeView, setActiveView] = useState<'calls' | 'inventory' | 'escalations'>('calls')
  const [calls, setCalls] = useState<Call[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [health, setHealth] = useState({ backend: false, pipeline: false, agent: false })
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isDialing, setIsDialing] = useState(false)
  const [transcript, setTranscript] = useState<{role: string, content: string}[]>([])

  // Polling logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Health
        const [b, p, a] = await Promise.all([
          axios.get(`${BACKEND_URL}/`).catch(() => null),
          axios.get(`${PIPELINE_URL}/`).catch(() => null),
          axios.get(`${AGENT_URL}/health`).catch(() => null)
        ])
        setHealth({ backend: !!b, pipeline: !!p, agent: !!a })

        // Data
        const [callsRes, prodRes, escRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/calls`),
          axios.get(`${BACKEND_URL}/api/products`),
          axios.get(`${BACKEND_URL}/api/escalations`).catch(() => ({ data: [] }))
        ])
        setCalls(callsRes.data || [])
        setProducts(prodRes.data || [])
        setEscalations(escRes.data || [])
      } catch (e) {}
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const startCall = async () => {
    if (!phoneNumber) return
    setIsDialing(true)
    try {
      await axios.post(`${PIPELINE_URL}/outbound-call?phone_number=${encodeURIComponent(phoneNumber)}`)
    } catch (e) {
      alert("Failed to initiate call")
    } finally {
      setIsDialing(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* SIDE NAVIGATION */}
      <nav className="w-20 border-r border-slate-200 bg-white flex flex-col items-center py-8 gap-8">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Activity size={24} />
        </div>
        
        <div className="flex flex-col gap-4 mt-4">
          {[
            { id: 'calls', icon: <Phone size={22} />, label: 'Calls' },
            { id: 'inventory', icon: <Tag size={22} />, label: 'Menu' },
            { id: 'escalations', icon: <ShieldAlert size={22} />, label: 'Escalated' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={cn(
                "p-3 rounded-xl transition-all relative group",
                activeView === item.id ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {item.icon}
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </span>
            </button>
          ))}
        </div>
        
        <div className="mt-auto">
          <button className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
            <Settings size={22} />
          </button>
        </div>
      </nav>

      {/* SUB-PANEL (Listings) */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <header className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg capitalize">{activeView}</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeView}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeView === 'calls' && (
            calls.map(call => (
              <div 
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  selectedCall?.id === call.id ? "border-indigo-600 bg-indigo-50/30 shadow-sm" : "border-slate-100 hover:bg-slate-50"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{call.customer_name || 'Inbound User'}</p>
                    <p className="text-xs text-slate-500 font-mono">{call.phone_number}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    call.status === 'in-progress' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {call.status}
                  </span>
                </div>
              </div>
            ))
          )}

          {activeView === 'inventory' && (
            products.map(product => (
              <div key={product.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-xs text-indigo-600 font-bold">₹{product.price}</p>
                </div>
                <div className={cn("w-2 h-2 rounded-full", product.is_available ? "bg-emerald-500" : "bg-slate-300")} />
              </div>
            ))
          )}

          {activeView === 'escalations' && (
            escalations.map(esc => (
              <div key={esc.id} className="p-4 rounded-xl border border-amber-100 bg-amber-50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={14} className="text-amber-600" />
                  <p className="text-xs font-bold text-amber-700 uppercase">Attention Required</p>
                </div>
                <p className="text-sm font-semibold">{esc.customer_name || 'Customer'}</p>
                <p className="text-xs text-amber-600 mt-1 italic">Reason: {esc.reason.replace('_', ' ')}</p>
                <button className="mt-3 w-full py-1.5 bg-white border border-amber-200 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all">
                  RESOLVE
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Workspace Header */}
        <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-lg px-4 py-2 border border-slate-200 w-80">
              <Phone className="text-slate-400 mr-3" size={18} />
              <input 
                type="text" 
                placeholder="Call a number..." 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-500 font-mono"
              />
            </div>
            <button 
              onClick={startCall}
              disabled={isDialing || !phoneNumber}
              className={cn(
                "px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md",
                isDialing ? "bg-slate-200 text-slate-400" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
              )}
            >
              <Phone size={18} /> {isDialing ? 'Initiating...' : 'Start Call'}
            </button>
          </div>

          <div className="flex items-center gap-4 border-l border-slate-100 pl-8">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">System Admin</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 flex items-center gap-1">
                <CheckCircle2 size={10} /> Online
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="enterprise-panel p-4 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Phone size={20} /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Calls</p>
                <p className="text-xl font-bold">{calls.filter(c => c.status === 'in-progress').length}</p>
              </div>
            </div>
            <div className="enterprise-panel p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><History size={20} /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Today</p>
                <p className="text-xl font-bold">{calls.length + 12}</p>
              </div>
            </div>
            <div className="enterprise-panel p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><ShieldAlert size={20} /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Escalated</p>
                <p className="text-xl font-bold text-amber-600">{escalations.length}</p>
              </div>
            </div>
            <div className="enterprise-panel p-4 flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-lg"><Clock size={20} /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avg Latency</p>
                <p className="text-xl font-bold">1.2s</p>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
            {/* Live Call Center */}
            <div className="col-span-2 flex flex-col gap-6 overflow-hidden">
              {/* Waveform Visualization */}
              <div className="enterprise-panel p-6 flex flex-col items-center relative overflow-hidden bg-gradient-to-br from-indigo-50/30 to-white">
                <div className="w-full flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acoustic Signal Monitor</h3>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-indigo-400 rounded-full animate-ping" style={{animationDelay: `${i*0.2}s`}} />)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 h-16">
                  {[...Array(40)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1.5 bg-indigo-600 rounded-full wave-bar"
                      style={{ 
                        animationDelay: `${i * 0.04}s`,
                        height: `${30 + Math.random() * 70}%`
                      }}
                    />
                  ))}
                </div>
                <div className="mt-6 flex gap-8 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Volume</p>
                    <p className="text-sm font-bold text-slate-700">-12.4dB</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Frequency</p>
                    <p className="text-sm font-bold text-slate-700">3.4kHz</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Clarity</p>
                    <p className="text-sm font-bold text-emerald-600">High</p>
                  </div>
                </div>
              </div>

              {/* Live Logs/Transcription */}
              <div className="enterprise-panel flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex gap-4">
                    <button className="text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 pb-1">Transcript</button>
                    <button className="text-xs font-bold text-slate-400 hover:text-slate-600 pb-1">System Logs</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {[
                    { role: 'assistant', content: 'Hello! Automaton AI here. How can I help with your order today?' },
                    { role: 'user', content: 'Yeah hi, I want to order two double cheese burgers and a large coke.' },
                    { role: 'assistant', content: 'Got it. Two Double Cheese Burgers and one Large Coke. Would you like to add some fries to that?' },
                  ].map((msg, i) => (
                    <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{msg.role}</span>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                        msg.role === 'user' ? "bg-white border border-slate-200 rounded-tr-none" : "bg-indigo-600 text-white rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {/* Real-time typing placeholder */}
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Processing Utterance...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Intelligence Panel */}
            <div className="flex flex-col gap-6">
              <div className="enterprise-panel p-6 flex flex-col gap-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  Call Intelligence
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Confidence Level</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 w-[88%]" />
                      </div>
                      <span className="text-xs font-bold text-indigo-600">88%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Extracted Information</p>
                    {[
                      { label: 'Item 1', val: 'Double Cheese Burger (x2)', status: 'confirmed' },
                      { label: 'Item 2', val: 'Large Coke (x1)', status: 'confirmed' },
                      { label: 'Address', val: 'Pending extraction...', status: 'waiting' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-mono">{item.label}</p>
                          <p className="text-xs font-semibold">{item.val}</p>
                        </div>
                        {item.status === 'confirmed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all">
                    <Check size={16} /> Confirm Order
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-100 hover:bg-amber-600 transition-all">
                    <RotateCcw size={16} /> Force Retry
                  </button>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="enterprise-panel p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-600" />
                  Network Health
                </h3>
                <div className="space-y-4">
                  {[
                    { l: 'STT Latency', v: 420, max: 1000 },
                    { l: 'LLM Latency', v: 1100, max: 3000 },
                    { l: 'TTS Latency', v: 340, max: 1000 },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                        <span className="text-slate-400">{s.l}</span>
                        <span className="text-slate-600">{s.v}ms</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(s.v/s.max)*100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATUS FOOTER */}
        <footer className="h-10 border-t border-slate-200 bg-white flex items-center justify-between px-8 text-slate-500">
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", health.backend ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Backend 8001</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", health.pipeline ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Pipeline 8000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", health.agent ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Agent 4000</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <Globe size={12} className="text-indigo-600" />
            Active Region: IN-SOUTH-1
          </div>
        </footer>
      </main>
    </div>
  )
}
