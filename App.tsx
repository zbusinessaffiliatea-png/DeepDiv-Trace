import { useEffect, useState } from "react";
import { web3Service } from "./web3";
import { AlertCircle, ShieldCheck, Activity, Wallet, Hash, ChevronRight } from "lucide-react";

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [stats, setStats] = useState({ balance: "0", totalCampaigns: 0 });
  const [roles, setRoles] = useState({ isAdmin: false, isAllocator: false });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState<{ [key: number]: string }>({});
  const [donating, setDonating] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadData = async (userAccount?: string) => {
    setLoading(true);
    const globalStats = await web3Service.getGlobalStats();
    if (globalStats) {
      setStats(globalStats);
      const camps = await web3Service.getCampaigns(globalStats.totalCampaigns);
      setCampaigns(camps);
    }
    
    if (userAccount) {
      const userRoles = await web3Service.getUserRoles(userAccount);
      setRoles(userRoles);
    }
    setLoading(false);
  };

  useEffect(() => {
    web3Service.getAccount().then(acc => {
      setAccount(acc);
      loadData(acc || undefined);
    });
  }, []);

  const connectWallet = async () => {
    try {
      setError("");
      const acc = await web3Service.connectWallet();
      setAccount(acc);
      if (acc) loadData(acc);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    }
  };

  const handleDonate = async (campaignId: number) => {
    const amount = donateAmount[campaignId];
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setDonating(campaignId);
    setError("");
    try {
      await web3Service.donate(campaignId, amount);
      // Wait a moment and reload data
      setTimeout(() => loadData(account || undefined), 3000);
      setDonateAmount({ ...donateAmount, [campaignId]: "" });
    } catch (err: any) {
      setError(err.message || "Donation failed. Make sure you have enough USDC and are on Arbitrum One.");
    } finally {
      setDonating(null);
    }
  };

  // Format account string securely
  const formatAccount = (acc: string) => `${acc.slice(0, 6)}...${acc.slice(-4)}`;

  return (
    <div className="min-h-screen font-[Helvetica_Neue,Arial,sans-serif] selection:bg-[#00f2ff]/30 text-[#ffffff] bg-[radial-gradient(circle_at_100%_0%,#001a1a_0%,#000000_50%),radial-gradient(circle_at_0%_100%,#001220_0%,#000000_50%)] bg-black overflow-hidden relative" style={{ overflowY: 'auto' }}>
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-[10px] sticky top-0 z-50">
        <div className="max-w-[1024px] mx-auto px-[40px] h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="w-[12px] h-[12px] bg-[#00f2ff] shadow-[0_0_10px_#00f2ff] rounded-[2px] rotate-45 shrink-0 flex items-center justify-center">
            </div>
            <span className="font-[800] text-[20px] tracking-[2px] text-[#00f2ff] uppercase">DeepDiv-Trace</span>
          </div>
          
          <div className="flex items-center gap-[20px]">
            {(roles.isAdmin || roles.isAllocator) && (
              <div className="hidden sm:flex items-center gap-[6px] px-[10px] py-[4px] rounded-[100px] bg-[#00ff41]/10 border border-[#00ff41] text-[#00ff41] text-[10px] uppercase font-[700]">
                <ShieldCheck className="w-3 h-3" />
                Status: {roles.isAdmin ? "Administrator" : "Allocator"}
              </div>
            )}
            
            {account ? (
              <div className="flex items-center gap-[8px] px-[18px] py-[8px] rounded-[4px] bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[13px] font-[600]">
                {formatAccount(account)}
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="flex items-center gap-[8px] px-[18px] py-[8px] rounded-[4px] bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] font-[600] transition-colors hover:bg-[#00f2ff]/20 text-[13px] cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1024px] mx-auto px-[40px] py-[40px] space-y-[32px]">
        
        {/* Error Alert */}
        {error && (
          <div className="p-[16px] rounded-[8px] border border-red-500/30 bg-red-500/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[#ffb3b3] text-[13px]">{error}</p>
          </div>
        )}

        {/* Global Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
          <div className="p-[20px] rounded-[8px] border border-white/10 bg-[#141414]/40 relative after:absolute after:bottom-[-1px] after:left-[10%] after:w-[80%] after:h-[1px] after:content-[''] after:bg-gradient-to-r after:from-transparent after:via-[#00f2ff] after:to-transparent">
            <h3 className="text-white/40 text-[11px] uppercase tracking-[1px] mb-[4px]">Contract Balance (USDC)</h3>
            <div className="text-[24px] font-[700] text-white">{stats.balance}</div>
            <div className="mt-[8px] flex items-center gap-[8px] text-[12px] text-white/30 font-mono">
              <Hash className="w-3 h-3 text-[#00f2ff]" />
              Arbitrum One
            </div>
          </div>
          <div className="p-[20px] rounded-[8px] border border-white/10 bg-[#141414]/40 relative after:absolute after:bottom-[-1px] after:left-[10%] after:w-[80%] after:h-[1px] after:content-[''] after:bg-gradient-to-r after:from-transparent after:via-[#00f2ff] after:to-transparent">
            <h3 className="text-white/40 text-[11px] uppercase tracking-[1px] mb-[4px]">Active Campaigns</h3>
            <div className="text-[24px] font-[700] text-white">{stats.totalCampaigns || (campaigns.length > 0 ? campaigns.length : 0)}</div>
            <div className="mt-[8px] flex items-center gap-[8px] text-[12px] text-white/30 font-mono">
              <Activity className="w-3 h-3 text-[#00ff41]" />
              Live On-Chain
            </div>
          </div>
        </section>

        {/* Campaign List */}
        <section className="bg-[#0a0a0a]/50 border border-white/5 rounded-[12px] p-[24px] overflow-hidden">
          <div className="flex items-center justify-between mb-[24px]">
            <h2 className="text-[14px] uppercase tracking-[2px] m-0 text-white/70">Humanitarian Campaigns</h2>
            <div className="text-[10px] font-mono text-[#00f2ff] px-[10px] py-[4px] rounded-[100px] bg-[#00f2ff]/10 border border-[#00f2ff]/30">USDC ONLY</div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="h-[250px] rounded-[12px] border border-white/5 bg-[#141414]/80"></div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-[40px] text-center rounded-[12px] border border-white/5 bg-[#141414]/50">
              <p className="text-white/50 text-[14px]">No active campaigns found on this network.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              {campaigns.map((camp) => (
                <div key={camp.id} className="flex flex-col bg-[#141414]/80 border border-[#00f2ff]/20 rounded-[12px] p-[24px] sm:p-[32px] shadow-[0_0_40px_rgba(0,242,255,0.05)] transition-colors hover:border-[#00f2ff]/40">
                  <div className="flex justify-between items-start mb-[16px]">
                    <h3 className="m-0 text-[15px] sm:text-[18px] font-[600] text-white leading-tight">{camp.name}</h3>
                    {camp.active ? (
                      <span className="text-[10px] px-[10px] py-[4px] bg-[#00ff41]/10 border border-[#00ff41] text-[#00ff41] rounded-[100px] uppercase font-[700]">Active</span>
                    ) : (
                      <span className="text-[10px] px-[10px] py-[4px] bg-white/10 border border-white/20 text-white/50 rounded-[100px] uppercase font-[700]">Closed</span>
                    )}
                  </div>
                  
                  {/* Progress */}
                  <div className="mb-[24px]">
                    <div className="flex justify-between items-end mb-[8px]">
                      <span className="text-[14px] font-[700] text-white">{camp.raised} <span className="text-[11px] font-[400] opacity-50">USDC</span></span>
                      <span className="text-[11px] text-[#00ff41]">{(Math.min((Number(camp.raised) / Number(camp.goal)) * 100, 100)).toFixed(0)}% Funded</span>
                    </div>
                    <div className="w-full h-[4px] bg-white/10 rounded-[2px] relative overflow-hidden">
                      <div 
                        className="absolute h-full left-0 top-0 bg-[#00f2ff] shadow-[0_0_8px_#00f2ff] rounded-[2px] transition-all duration-1000" 
                        style={{ width: `${Math.min((Number(camp.raised) / Number(camp.goal)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* IPFS Proof */}
                  <div className="mb-[24px] flex items-center justify-between">
                    <p className="m-0 text-[12px] text-white/50">IPFS Checksum Validation</p>
                    <a 
                      href={`https://ipfs.io/ipfs/${camp.ipfsHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="m-0 text-[12px] text-[#00f2ff] hover:brightness-125 flex items-center gap-1 font-mono tracking-tight transition-all"
                    >
                      {camp.ipfsHash.slice(0, 8)}...{camp.ipfsHash.slice(-6)}
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Donate Action */}
                  <div className="mt-auto flex flex-col gap-[8px]">
                    <label className="block text-[11px] uppercase text-[#00f2ff] tracking-[1px] mb-[4px]">Amount (USDC)</label>
                    <div className="flex items-center gap-[12px]">
                      <div className="relative flex-1">
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-black/40 border border-white/10 py-[12px] pl-[12px] pr-[12px] rounded-[4px] text-white text-[16px] focus:outline-none focus:border-[#00f2ff] box-border transition-colors"
                          value={donateAmount[camp.id] || ""}
                          onChange={(e) => setDonateAmount({...donateAmount, [camp.id]: e.target.value})}
                          disabled={!camp.active}
                        />
                      </div>
                      <button
                        onClick={() => handleDonate(camp.id)}
                        disabled={!camp.active || donating === camp.id || (!account && !window.ethereum)}
                        className={`px-[16px] py-[13px] rounded-[4px] font-[800] text-[13px] uppercase tracking-[1px] flex items-center justify-center min-w-[140px] border-none transition-all ${
                          !camp.active 
                            ? "bg-white/10 text-white/30 cursor-not-allowed" 
                            : "bg-[#00f2ff] text-black hover:bg-[#00f2ff]/90 cursor-pointer"
                        }`}
                      >
                        {donating === camp.id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
                        ) : account ? "Authorize" : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
