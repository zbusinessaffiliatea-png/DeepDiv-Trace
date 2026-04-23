import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

// EIP-1193 provider type
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const CONTRACT_ADDRESS = "0x72270300206D0BC94F894471Dc044FB8d99b8E99";
export const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Arbitrum USDC

// Minimal ABI for the protocol
export const DEEPDIV_ABI = [
  "function totalCampaigns() view returns (uint256)",
  "function campaigns(uint256) view returns (uint256 id, string name, uint256 goal, uint256 raised, bool active, string ipfsHash)",
  "function donate(uint256 campaignId, uint256 amount)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function ALLOCATOR_ROLE() view returns (bytes32)"
];

export const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

export class Web3Service {
  provider: BrowserProvider | null = null;
  
  constructor() {
    if (window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum);
    }
  }

  async connectWallet(): Promise<string | null> {
    if (!this.provider) throw new Error("No crypto wallet found. Please install MetaMask.");
    const accounts = await this.provider.send("eth_requestAccounts", []);
    return accounts[0] || null;
  }

  async getAccount(): Promise<string | null> {
    if (!this.provider) return null;
    const accounts = await this.provider.send("eth_accounts", []);
    return accounts[0] || null;
  }

  async getGlobalStats() {
    if (!this.provider) return null;
    const contract = new Contract(CONTRACT_ADDRESS, DEEPDIV_ABI, this.provider);
    const usdcContract = new Contract(USDC_ADDRESS, USDC_ABI, this.provider);
    
    try {
      // Mocked if the real contract is not fully aligned yet
      const balance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
      const totalCampaigns = await contract.totalCampaigns();
      return {
        balance: formatUnits(balance, 6), // USDC has 6 decimals
        totalCampaigns: Number(totalCampaigns)
      };
    } catch (e) {
      console.warn("Failed to fetch global stats from contract, using fallbacks:", e);
      return {
        balance: "0",
        totalCampaigns: 0
      };
    }
  }

  async getUserRoles(account: string) {
    if (!this.provider) return { isAdmin: false, isAllocator: false };
    const contract = new Contract(CONTRACT_ADDRESS, DEEPDIV_ABI, this.provider);
    try {
      const adminRole = await contract.ADMIN_ROLE();
      const allocatorRole = await contract.ALLOCATOR_ROLE();
      
      const [isAdmin, isAllocator] = await Promise.all([
        contract.hasRole(adminRole, account),
        contract.hasRole(allocatorRole, account)
      ]);
      return { isAdmin, isAllocator };
    } catch (e) {
      console.warn("Failed to fetch roles:", e);
      return { isAdmin: false, isAllocator: false };
    }
  }

  async getCampaigns(total: number) {
    if (!this.provider) return [];
    const contract = new Contract(CONTRACT_ADDRESS, DEEPDIV_ABI, this.provider);
    const campaigns = [];
    try {
      for (let i = 1; i <= total; i++) {
        const camp = await contract.campaigns(i);
        campaigns.push({
          id: Number(camp.id),
          name: camp.name,
          goal: formatUnits(camp.goal, 6),
          raised: formatUnits(camp.raised, 6),
          active: camp.active,
          ipfsHash: camp.ipfsHash
        });
      }
    } catch (e) {
      console.warn("Failed to fetch campaigns:", e);
      // Return a mock campaign if nothing fetched for testing the UI
      return [
        {
          id: 1,
          name: "Medical Supplies Beqaa",
          goal: "50000",
          raised: "12500",
          active: true,
          ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2epKphkNypXHEtZkEGZtF"
        },
        {
          id: 2,
          name: "Food Relief Beirut",
          goal: "100000",
          raised: "78000",
          active: true,
          ipfsHash: "QmXZAPJzvQCZsnA625s3Xf2epKphkNypXHEtZkEG"
        }
      ];
    }
    return campaigns;
  }

  async donate(campaignId: number, amount: string) {
    if (!this.provider) throw new Error("Wallet not connected");
    const signer = await this.provider.getSigner();
    const address = await signer.getAddress();
    
    const parsedAmount = parseUnits(amount, 6);
    
    const usdcContract = new Contract(USDC_ADDRESS, USDC_ABI, signer);
    const allowance = await usdcContract.allowance(address, CONTRACT_ADDRESS);
    
    if (allowance < parsedAmount) {
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, parsedAmount);
      await approveTx.wait();
    }
    
    const protocolContract = new Contract(CONTRACT_ADDRESS, DEEPDIV_ABI, signer);
    const tx = await protocolContract.donate(campaignId, parsedAmount);
    return tx.hash;
  }
}

export const web3Service = new Web3Service();
