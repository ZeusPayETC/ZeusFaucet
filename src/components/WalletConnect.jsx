import React, { useState, useEffect, useRef, forwardRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Info } from "lucide-react";

const WalletConnect = forwardRef(({ onConnect }, ref) => {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("❌ MetaMask is not installed!", {
        icon: <XCircle className="text-red-500" />,
      });
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      onConnect(address);

      toast.success("✅ Wallet connected!", {
        icon: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      console.error("Wallet connection failed:", err);
      toast.error("❌ Failed to connect wallet", {
        icon: <XCircle className="text-red-500" />,
      });
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          onConnect(accounts[0]);
          toast.info("ℹ️ Wallet account changed", {
            icon: <Info className="text-blue-500" />,
          });
        } else {
          setAccount(null);
          onConnect(null);
          toast.error("❌ Wallet disconnected", {
            icon: <XCircle className="text-red-500" />,
          });
        }
      });
    }
  }, [onConnect]);

  return (
    <div className="flex items-center justify-center mb-4">
      {/* Pulsating Status Dot */}
      <span
        className={`h-3 w-3 rounded-full mr-2 ${
          account
            ? "bg-green-400 animate-pulse shadow-lg shadow-green-500/50"
            : "bg-red-500 shadow-lg shadow-red-500/50"
        }`}
      ></span>

      {/* Wallet Button */}
      <button
        ref={ref}
        onClick={connectWallet}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-semibold transition shadow-lg"
      >
        {account ? "🔗 Reconnect Wallet" : "🔌 Connect Wallet"}
      </button>
    </div>
  );
});

export default WalletConnect;
