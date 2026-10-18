'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ScanBarcode, Camera, Search, Check, AlertCircle, RefreshCw,
} from 'lucide-react';
import { fetchProductByBarcode } from '@/lib/openfoodfacts';
import { FoodItem, MealType } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  onAddFood: (mealType: MealType, food: FoodItem, grams: number) => void;
}

const SAMPLE_BARCODES = [
  { code: '3017620422003', label: 'Nutella Ferrero' },
  { code: '5449000000996', label: 'Coca-Cola Zero' },
  { code: '7622210449283', label: 'Oreo Galletas' },
  { code: '8480000210214', label: 'Avena Hacendado' },
  { code: '8410128003014', label: 'Alpro Bebida Soja' },
  { code: '8000500037560', label: 'Ferrero Rocher' },
];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack',
};

export const BarcodeScannerModal: React.FC<Props> = ({
  isOpen, onClose, defaultMealType = 'lunch', onAddFood,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<MealType>(defaultMealType);
  const [useFront, setUseFront] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Iniciando cámara...');
  const [scannerReady, setScannerReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const detectedRef = useRef(false);
  const activeRef = useRef(false);

  // ── Stop camera completely ──────────────────────────────────────────
  const stopCamera = useCallback(async () => {
    activeRef.current = false;
    try { controlsRef.current?.stop(); } catch (_) {}
    controlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    readerRef.current = null;
    setScanning(false);
    setScannerReady(false);
  }, []);

  // ── Start ZXing scanner ─────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    detectedRef.current = false;
    activeRef.current = true;
    setCameraError(null);
    setStatusMsg('Solicitando acceso a la cámara...');
    setScanning(false);
    setScannerReady(false);

    try {
      // Dynamically import to avoid SSR issues
      const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, NotFoundException } =
        await import('@zxing/library');

      // Configure hints for food-product 1D barcodes
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.RSS_14,
        BarcodeFormat.DATA_MATRIX,
      ]);
      // Try harder — more CPU but much better on mobile
      hints.set(DecodeHintType.TRY_HARDER, true);

      const { BrowserMultiFormatReader: MultiReader } = await import('@zxing/browser');
      const reader = new MultiReader(hints, { delayBetweenScanAttempts: 100 });
      readerRef.current = reader;

      if (!activeRef.current) return;

      // Get camera stream with rear camera preference
      const constraints: MediaStreamConstraints = {
        video: useFront
          ? { facingMode: 'user' }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach((t) => t.stop()); return; }

      video.srcObject = stream;
      await video.play();
      setStatusMsg('Listo — apunta al código de barras');
      setScanning(true);
      setScannerReady(true);

      // Start decode loop using the video element
      controlsRef.current = await reader.decodeFromVideoElement(
        video,
        (result, err) => {
          if (!activeRef.current) return;
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            handleDetected(result.getText());
          }
          // Ignore NotFoundException — it fires every frame when no barcode in view
        }
      );
    } catch (err: any) {
      if (!activeRef.current) return;
      console.error('[ZXing] Error:', err);
      let msg = 'No se pudo acceder a la cámara.';
      const e = err?.message || '';
      if (e.includes('NotAllowed') || e.includes('Permission') || e.includes('denied')) {
        msg = 'Permiso de cámara denegado. Ve a los ajustes del navegador y permite el acceso a la cámara para este sitio.';
      } else if (e.includes('NotFound') || e.includes('Devices')) {
        msg = 'No se encontró ninguna cámara en este dispositivo.';
      } else if (e.includes('NotReadable') || e.includes('busy')) {
        msg = 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
      }
      setCameraError(msg);
      setScanning(false);
    }
  }, [useFront]);

  // ── Handle a detected barcode ───────────────────────────────────────
  const handleDetected = useCallback(async (barcode: string) => {
    await stopCamera();
    setLookingUp(true);
    setCameraError(null);

    const found = await fetchProductByBarcode(barcode);
    setLookingUp(false);

    if (found) {
      setProduct(found);
      setGrams(found.serving_size_g || 100);
    } else {
      setCameraError(`Código "${barcode}" no encontrado en Open Food Facts.`);
      detectedRef.current = false;
      // Restart camera so user can try again
      setTimeout(() => startCamera(), 400);
    }
  }, [stopCamera, startCamera]);

  // ── Manual search ───────────────────────────────────────────────────
  const handleManualSearch = async (code?: string) => {
    const target = (code ?? manualBarcode).trim();
    if (!target) return;
    await stopCamera();
    detectedRef.current = true;
    setLookingUp(true);
    setCameraError(null);
    const found = await fetchProductByBarcode(target);
    setLookingUp(false);
    if (found) {
      setProduct(found);
      setGrams(found.serving_size_g || 100);
    } else {
      setCameraError(`Código "${target}" no encontrado en Open Food Facts.`);
      detectedRef.current = false;
    }
  };

  const handleConfirmAdd = () => {
    if (!product) return;
    onAddFood(meal, product, Math.max(1, grams));
    setProduct(null);
    detectedRef.current = false;
    onClose();
  };

  // ── Lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !product) {
      const t = setTimeout(startCamera, 300);
      return () => { clearTimeout(t); stopCamera(); };
    }
    if (!isOpen || activeTab !== 'camera') stopCamera();
  }, [isOpen, activeTab, product, useFront]);

  useEffect(() => {
    if (isOpen) setMeal(defaultMealType);
  }, [isOpen, defaultMealType]);

  if (!isOpen) return null;

  // ── UI ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg bg-[#0B0F19] border border-white/10 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Escáner de Alimentos</h2>
              <p className="text-[11px] text-slate-400">Open Food Facts — Base de datos mundial</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {!product && (
          <div className="flex p-2 bg-slate-900/50 border-b border-white/5 shrink-0">
            {(['camera', 'manual'] as const).map((tab) => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); if (tab !== 'camera') stopCamera(); setCameraError(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  activeTab === tab ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}>
                {tab === 'camera' ? <><Camera className="w-3.5 h-3.5" />Cámara en Vivo</> : <><Search className="w-3.5 h-3.5" />Código Manual</>}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-2.5 border-b border-white/5 shrink-0">
          <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Añadir a:</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(MEAL_LABELS) as MealType[]).map((mealType) => (
              <button key={mealType} onClick={() => setMeal(mealType)}
                className={`py-1.5 text-[11px] font-bold rounded-lg border text-center transition ${
                  meal === mealType ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-white/5 text-slate-400 border-white/5'
                }`}>{MEAL_LABELS[mealType]}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {lookingUp ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              <p className="text-sm font-bold text-slate-200">Consultando Open Food Facts...</p>
            </div>

          ) : product ? (
            /* ── Product Found ─────────────────────────────────── */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Card */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name}
                    className="w-16 h-16 object-cover rounded-xl bg-slate-800 border border-white/5 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                    <ScanBarcode className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{product.brand || 'Producto'}</span>
                  <h3 className="text-sm font-bold text-white truncate">{product.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{product.barcode}</p>
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Kcal', value: product.calories_100g, color: 'text-emerald-400' },
                  { label: 'Proteína', value: `${product.protein_100g}g`, color: 'text-rose-400' },
                  { label: 'Carbos', value: `${product.carbs_100g}g`, color: 'text-sky-400' },
                  { label: 'Grasas', value: `${product.fat_100g}g`, color: 'text-amber-400' },
                ].map((m) => (
                  <div key={m.label} className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                    <p className="text-[10px] text-slate-400">{m.label}</p>
                    <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[9px] text-slate-500">/100g</p>
                  </div>
                ))}
              </div>

              {/* Portion */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Cantidad:</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" max="2000" value={grams}
                      onChange={(e) => setGrams(Number(e.target.value))}
                      className="flex-1 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-lg font-bold text-white text-center focus:outline-none focus:border-emerald-500" />
                    <span className="text-sm font-semibold text-slate-400">g</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[50, 100, 150, 200, 250].map((g) => (
                      <button key={g} onClick={() => setGrams(g)}
                        className={`flex-1 text-[11px] font-bold py-1 rounded-lg border transition ${
                          grams === g ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-white/5 text-slate-300 border-white/5'
                        }`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">Total {grams}g:</span>
                  <div className="flex gap-2">
                    <span className="text-white">{Math.round((product.calories_100g * grams) / 100)} kcal</span>
                    <span className="text-rose-400">{Math.round(((product.protein_100g * grams) / 100) * 10) / 10}g P</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex gap-2">
                <button onClick={() => { setProduct(null); detectedRef.current = false; setActiveTab('camera'); }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition">
                  ← Volver
                </button>
                <button onClick={handleConfirmAdd}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20">
                  <Check className="w-4 h-4" /> Añadir a mi Diario
                </button>
              </div>
            </div>

          ) : activeTab === 'camera' ? (
            /* ── Live Camera (ZXing) ───────────────────────────── */
            <div className="space-y-3">
              {/* Video viewport */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-white/10" style={{ minHeight: 280 }}>
                {/* Native <video> — ZXing controls it directly */}
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                  style={{ minHeight: 280, display: scannerReady ? 'block' : 'none' }}
                />

                {/* Corner brackets overlay */}
                {scannerReady && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-3/4" style={{ aspectRatio: '2/1' }}>
                      {/* Top-left */}
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                      {/* Top-right */}
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                      {/* Bottom-left */}
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                      {/* Bottom-right */}
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
                      {/* Laser sweep */}
                      <div className="scanner-laser" />
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {!scannerReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black">
                    <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
                    <p className="text-xs text-slate-300 font-semibold">{statusMsg}</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] text-slate-400">
                  {scannerReady ? 'Centra el código de barras en el recuadro' : statusMsg}
                </p>
                <button onClick={() => setUseFront((v) => !v)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {useFront ? 'Trasera' : 'Frontal'}
                </button>
              </div>

              {/* Tips */}
              {scannerReady && (
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 space-y-0.5">
                  <p className="font-bold text-slate-300 mb-1">Consejos para detectar rápido:</p>
                  <p>• Mantén el código <b>horizontal</b> dentro del recuadro</p>
                  <p>• Distancia ideal: <b>10–20 cm</b> del código</p>
                  <p>• Buena iluminación, sin reflejos ni sombras</p>
                  <p>• Mantén el móvil <b>quieto</b> 1–2 segundos</p>
                </div>
              )}

              {/* Error */}
              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{cameraError}</p>
                    <button onClick={() => setActiveTab('manual')}
                      className="mt-1.5 text-emerald-400 font-bold underline">
                      Introducir código manualmente →
                    </button>
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* ── Manual Input ──────────────────────────────────── */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Número de código de barras (EAN-13, EAN-8, UPC):
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel" inputMode="numeric" pattern="[0-9]*"
                    placeholder="Ej. 8480000210214"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="flex-1 px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button onClick={() => handleManualSearch()} disabled={!manualBarcode.trim()}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition">
                    Buscar
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2">
                <p className="text-xs font-bold text-slate-300">Productos de prueba:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_BARCODES.map((s) => (
                    <button key={s.code}
                      onClick={() => { setManualBarcode(s.code); handleManualSearch(s.code); }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-white/5 text-left transition group">
                      <p className="text-xs font-bold text-white group-hover:text-emerald-400">{s.label}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{s.code}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
