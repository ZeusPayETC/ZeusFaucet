import React, { useEffect, useRef, useState } from "react";
import WalletConnect from "./components/WalletConnect";
import ClaimButton from "./components/ClaimButton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { XCircle } from "lucide-react";
import { toast } from "react-toastify";


export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [zeusDisplay, setZeusDisplay] = useState("Loading...");
  const [etcDisplay, setEtcDisplay] = useState("...");
  const [zeusRaw, setZeusRaw] = useState(null);

  const connectBtnRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

  const emphasizeConnect = () => {
    if (connectBtnRef.current) {
      connectBtnRef.current.classList.add("animate-ping-once");
      setTimeout(() => {
        connectBtnRef.current.classList.remove("animate-ping-once");
      }, 1500);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    toast.info("\ud83d\udd0c Wallet disconnected", {
      icon: <XCircle className="text-blue-400" />,
    });
  };

  const zeusColorClass = (() => {
    if (zeusRaw === null) return "text-yellow-300";
    if (zeusRaw <= 0) return "text-red-400";
    if (zeusRaw <= 50000) return "text-orange-400";
    return "text-yellow-300";
  })();

  useEffect(() => {
    let timer;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status`);
        const data = await res.json();
        if (res.ok && data?.balances) {
          setZeusDisplay(`Faucet: ${data.balances.zeusFormatted} ZEUS`);
          setEtcDisplay(data.balances.etcFormatted);
          setZeusRaw(Number(data.balances.zeusRaw));
        } else {
          setZeusDisplay("Faucet: —");
          setEtcDisplay("—");
          setZeusRaw(null);
        }
      } catch {
        setZeusDisplay("Faucet: —");
        setEtcDisplay("—");
        setZeusRaw(null);
      }
    };

    fetchStatus();
    timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, [API_BASE]);

  return (
  <div className="relative w-screen h-screen overflow-hidden bg-black font-sans text-white">
  {/* FULLSCREEN BACKGROUND IMAGE - NOW USING background-image FOR GUARANTEED COVERAGE */}
  <img
      src="/zeus-faucet-poster-landscape.png"
      alt="ZEUS Faucet Background"
      className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
    />

  {/* DARK OVERLAY */}
  <div className="absolute inset-0 z-10 flex flex-col justify-between"></div>

  {/* TOP LEFT BALANCE DISPLAY */}
  <div className="flex justify-between p-5">
    <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 shadow-xl">
      <div className={`${zeusColorClass} font-semibold text-sm`}>
       💰 {zeusDisplay}
      </div>
      <div className="text-green-300 font-semibold text-sm">
       ⛽ Gas: {etcDisplay} ETC
      </div>
    </div>
  </div>

  {/* TOP RIGHT WALLET CONNECT */}
  <div className="absolute top-5 right-5 z-20">
    <WalletConnect onConnect={setWalletAddress} ref={connectBtnRef} />
  </div>

  {/* CLAIM BUTTON CENTERED BELOW BACKGROUND TEXT */}
  <div className="flex justify-center mb-12">
    <div className="w-[min(90vw,420px)] px-4">
      <ClaimButton
        walletAddress={walletAddress}
        onEmphasize={emphasizeConnect}
      />
    </div>
  </div>

  {/* TOAST CONTAINER */}
  <ToastContainer position="top-right" autoClose={4000} theme="dark" />
</div>
);
}
