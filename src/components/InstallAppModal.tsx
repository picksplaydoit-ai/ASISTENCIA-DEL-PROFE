import React, { useState, useEffect } from "react";
import { Smartphone, Download, Share2, PlusSquare, X, CheckCircle2, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallAppModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalledJustNow, setIsInstalledJustNow] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalledJustNow(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalledJustNow(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg mx-auto flex items-center justify-center p-2 mb-3">
            <img src="/icons/icon.svg" alt="App Icon" className="w-full h-full" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight">Instalar en tu Celular</h3>
          <p className="text-xs text-indigo-100 mt-1">
            Úsala sin barra de navegador, con acceso directo rápido desde tu pantalla de inicio.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {isStandalone || isInstalledJustNow ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">¡App ya instalada!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Ya tienes instalada la app en tu pantalla de inicio. Puedes acceder a ella directamente con su ícono.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 space-y-1">
                <span className="font-bold block">✓ Acceso instantáneo</span>
                <span>Se instalará como una aplicación nativa en tu dispositivo móvil o computadora.</span>
              </div>

              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Instalar Ahora (1 Clic)
              </button>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-700">
                Sigue estos sencillos pasos en tu iPhone / iPad (Safari):
              </div>
              <ol className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Paso 1:</span> Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                  </div>
                </li>
                <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Paso 2:</span> Desliza hacia abajo y selecciona <strong>"Agregar al inicio"</strong>.
                  </div>
                </li>
                <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Paso 3:</span> Presiona <strong>Agregar</strong> en la esquina superior derecha. ¡Listo!
                  </div>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-700">
                Cómo instalar en Android o Computadora (Chrome / Edge):
              </div>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-indigo-600 bg-indigo-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                  <span>Abre el menú de opciones (los <strong>tres puntos ⋮</strong> arriba a la derecha en Chrome).</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-indigo-600 bg-indigo-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                  <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-indigo-600 bg-indigo-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">3</span>
                  <span>Confirma la instalación y aparecerá con su ícono en tus aplicaciones.</span>
                </li>
              </ol>
            </div>
          )}

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Cerrar ventana
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

