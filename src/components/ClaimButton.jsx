import React, { useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Info } from "lucide-react";

export default function ClaimButton({ walletAddress, onEmphasize }) {
  const [loading, setLoading] = useState(false);

  // ✅ Automatically detect API base URL (local or production)
  const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

  const claimTokens = async () => {
    if (!walletAddress) {
      toast.error("⚠️ Please connect your wallet first!", {
        icon: <XCircle className="text-red-500" />,
      });

      // Optional: highlight wallet connect button
      if (onEmphasize) onEmphasize();
      return;
    }

    try {
      setLoading(true);

      // ✅ Use dynamic endpoint
      const endpoint = `${API_BASE}/api/faucet`;

      console.log("🔗 Sending claim request to:", endpoint);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
      });

      // Try to parse safely even if backend sends unexpected HTML
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Invalid JSON response from faucet API");
      }

      if (res.ok) {
        toast.success("✅ Tokens sent successfully!", {
          icon: <CheckCircle className="text-green-500" />,
        });

        if (data.transactionHash) {
          toast.info(
            `🔗 View Tx: https://blockscout.com/etc/mainnet/tx/${data.transactionHash}`,
            {
              icon: <Info className="text-blue-500" />,
              autoClose: 8000,
            }
          );
        }
      } else {
        toast.error(`❌ ${data.message || "Request failed."}`, {
          icon: <XCircle className="text-red-500" />,
        });
      }
    } catch (err) {
      console.error("❌ Claim error:", err);
      toast.error(`❌ ${err.message || "Network or server error."}`, {
        icon: <XCircle className="text-red-500" />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={claimTokens}
      disabled={loading}
      className={`w-full py-3 rounded-xl text-white font-semibold transition shadow-lg ${
        loading
          ? "bg-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600"
      }`}
    >
      {loading ? "⏳ Claiming..." : "💧 Claim 50,000 Free ZEUS"}
    </button>
  );
}
