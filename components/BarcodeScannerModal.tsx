'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ScanBarcode,
  Camera,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Flashlight,
  FlashlightOff,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { fetchProductByBarcode } from '@/lib/openfoodfacts';
import { FoodItem, MealType } from '@/lib/types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  onAddFood: (mealType: MealType, food: FoodItem, grams: number) => void;
}

const SCANNER_ELEM_ID = 'fitfree-qr-region';

const SAMPLE_BARCODES = [
  { code: '3017620422003', label: 'Nutella Ferrero' },
  { code: '5449000000996', label: 'Coca-Cola Zero' },
  { code: '7622210449283', label: 'Oreo Galletas' },
  { code: '8480000210214', label: 'Avena Hacendado' },
  { code: '8410128003014', label: 'Alpro Bebida Soja' },
  { code: '8000500037560', label: 'Ferrero Rocher' },
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'lunch',
  onAddFood,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<FoodItem | null>(null);
  const [servingGrams, setServingGrams] = useState(100);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMealType);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Iniciando cámara...');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false); // prevent double-fire

  // ─── Cleanup ──────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.clear();
    } catch (_) {
      // Ignore stop errors; element may already be gone
    }
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  // ─── Start scanner ────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    detectedRef.current = false;
    setCameraError(null);
    setStatusMsg('Iniciando cámara...');
    await stopScanner();

    const elem = document.getElementById(SCANNER_ELEM_ID);
    if (!elem) return;

    try {
      const html5QrCode = new Html5Qrcode(SCANNER_ELEM_ID, {
        // Support all standard 1D barcode formats used in food products
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      // Compute scan box based on actual container size (mobile-safe)
      const containerW = elem.clientWidth || 300;
      const containerH = elem.clientHeight || 300;
      // Keep qrbox at 80% of the smaller dimension — always fits inside video
      const boxSide = Math.floor(Math.min(containerW, containerH) * 0.75);
      const qrbox = { width: boxSide, height: Math.floor(boxSide * 0.6) };

      const videoConstraints: MediaTrackConstraints = useFrontCamera
        ? { facingMode: 'user' }
        : {
            facingMode: { exact: 'environment' }, // real rear camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      await html5QrCode.start(
        videoConstraints,
        {
          fps: 15, // Higher fps → faster detection on mobile
          qrbox,
          // Do NOT set aspectRatio — let the browser fill naturally
          disableFlip: false,
          rememberLastUsedCamera: true,
        },
        (decodedText) => {
          if (detectedRef.current) return; // ignore duplicate frames
          detectedRef.current = true;
          handleBarcodeDetected(decodedText);
        },
        (_errorMsg) => {
          // Silent scan frame failures — normal when barcode not in frame
        }
      );

      setIsScanning(true);
      setStatusMsg('Listo — apunta al código de barras');
    } catch (err: any) {
      console.warn('[Scanner] start error:', err);

      // Fallback: if "exact" environment not available, try without constraint
      if (!useFrontCamera && err?.message?.includes('exact')) {
        try {
          const html5QrCode2 = new Html5Qrcode(SCANNER_ELEM_ID, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
            ],
            verbose: false,
          });
          scannerRef.current = html5QrCode2;
          const elem2 = document.getElementById(SCANNER_ELEM_ID);
          if (!elem2) return;
          const boxSide2 = Math.floor(Math.min(elem2.clientWidth || 300, elem2.clientHeight || 300) * 0.75);
          await html5QrCode2.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: { width: boxSide2, height: Math.floor(boxSide2 * 0.6) },
              disableFlip: false,
            },
            (decodedText) => {
              if (detectedRef.current) return;
              detectedRef.current = true;
              handleBarcodeDetected(decodedText);
            },
            () => {}
          );
          setIsScanning(true);
          setStatusMsg('Listo — apunta al código de barras');
          return;
        } catch (err2: any) {
          // Fall through to error display
          console.warn('[Scanner] fallback error:', err2);
        }
      }

      let userMsg = 'No se pudo acceder a la cámara.';
      if (err?.message?.includes('NotAllowed') || err?.message?.includes('Permission')) {
        userMsg = 'Permiso de cámara denegado. Ve a los ajustes del navegador y permite el acceso a la cámara para esta web.';
      } else if (err?.message?.includes('NotFound')) {
        userMsg = 'No se encontró ninguna cámara en este dispositivo.';
      }

      setCameraError(userMsg);
      setIsScanning(false);
    }
  }, [useFrontCamera, stopScanner]);

  // ─── Barcode handler ──────────────────────────────────────────────────
  const handleBarcodeDetected = async (barcode: string) => {
    await stopScanner();
    setIsLookingUp(true);
    setCameraError(null);

    const product = await fetchProductByBarcode(barcode);
    setIsLookingUp(false);

    if (product) {
      setScannedProduct(product);
      setServingGrams(product.serving_size_g || 100);
    } else {
      setCameraError(
        `Código "${barcode}" no encontrado en Open Food Facts. Puedes introducirlo manualmente.`
      );
      // Allow retry
      detectedRef.current = false;
      startScanner();
    }
  };

  const handleManualSearch = async (code?: string) => {
    const target = code || manualBarcode;
    if (!target.trim()) return;
    await stopScanner();
    await handleBarcodeDetected(target.trim());
  };

  // ─── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedProduct) {
      const timer = setTimeout(startScanner, 350);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
    if (!isOpen || activeTab !== 'camera') {
      stopScanner();
    }
  }, [isOpen, activeTab, scannedProduct, useFrontCamera]);

  useEffect(() => {
    setSelectedMeal(defaultMealType);
  }, [defaultMealType]);

  // ─── Confirm add ───────────────────────────────────────────────────────
  const handleConfirmAdd = () => {
    if (!scannedProduct) return;
    onAddFood(selectedMeal, scannedProduct, Math.max(1, servingGrams));
    // Reset state and close
    setScannedProduct(null);
    detectedRef.current = false;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg glass-panel bg-[#0B0F19] border border-white/10 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Escáner de Alimentos</h2>
              <p className="text-[11px] text-slate-400">Open Food Facts — Base de datos mundial</p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        {!scannedProduct && (
          <div className="flex p-2 bg-slate-900/50 border-b border-white/5 shrink-0">
            <button
              onClick={() => { setActiveTab('camera'); setCameraError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'camera' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara en Vivo</span>
            </button>
            <button
              onClick={() => { setActiveTab('manual'); stopScanner(); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'manual' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Código Manual</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLookingUp ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              <p className="text-sm font-bold text-slate-200">Consultando Open Food Facts...</p>
              <p className="text-xs text-slate-400">Obteniendo macros y valores por 100g</p>
            </div>

          ) : scannedProduct ? (
            /* ── Product found ──────────────────────────────── */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Product card */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
                {scannedProduct.image_url ? (
                  <img
                    src={scannedProduct.image_url}
                    alt={scannedProduct.name}
                    className="w-16 h-16 object-cover rounded-xl bg-slate-800 border border-white/5 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                    <ScanBarcode className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {scannedProduct.brand || 'Producto escaneado'}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate">{scannedProduct.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{scannedProduct.barcode}</p>
                </div>
              </div>

              {/* Macros per 100 g */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Kcal', value: scannedProduct.calories_100g, color: 'text-emerald-400' },
                  { label: 'Proteína', value: `${scannedProduct.protein_100g}g`, color: 'text-rose-400' },
                  { label: 'Carbos', value: `${scannedProduct.carbs_100g}g`, color: 'text-sky-400' },
                  { label: 'Grasas', value: `${scannedProduct.fat_100g}g`, color: 'text-amber-400' },
                ].map((m) => (
                  <div key={m.label} className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                    <p className="text-[10px] text-slate-400">{m.label}</p>
                    <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[9px] text-slate-500">/100g</p>
                  </div>
                ))}
              </div>

              {/* Portion selector */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Cantidad a registrar:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={servingGrams}
                      onChange={(e) => setServingGrams(Number(e.target.value))}
                      className="flex-1 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-lg font-bold text-white text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-400">g</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[50, 100, 150, 200, 250].map((g) => (
                      <button
                        key={g}
                        onClick={() => setServingGrams(g)}
                        className={`flex-1 text-[11px] font-bold py-1 rounded-lg border transition ${
                          servingGrams === g
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : 'bg-white/5 text-slate-300 border-white/5'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal selector */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Añadir a:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => {
                      const labels: Record<MealType, string> = {
                        breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack',
                      };
                      return (
                        <button
                          key={m}
                          onClick={() => setSelectedMeal(m)}
                          className={`py-1.5 text-[11px] font-bold rounded-xl border text-center transition ${
                            selectedMeal === m
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                              : 'bg-white/5 text-slate-400 border-white/5'
                          }`}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live total */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">Total {servingGrams}g:</span>
                  <div className="flex gap-2">
                    <span className="text-white">{Math.round((scannedProduct.calories_100g * servingGrams) / 100)} kcal</span>
                    <span className="text-rose-400">{Math.round(((scannedProduct.protein_100g * servingGrams) / 100) * 10) / 10}g P</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pb-safe">
                <button
                  onClick={() => { setScannedProduct(null); detectedRef.current = false; setActiveTab('camera'); }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition"
                >
                  Volver a escanear
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" />
                  Añadir a mi Diario
                </button>
              </div>
            </div>

          ) : activeTab === 'camera' ? (
            /* ── Live Camera ──────────────────────────────────── */
            <div className="space-y-3">
              {/* Scanner viewport — let html5-qrcode set its own height */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-white/10">
                {/* html5-qrcode mounts video here; DO NOT constrain height with CSS */}
                <div
                  id={SCANNER_ELEM_ID}
                  className="w-full"
                  style={{ minHeight: '240px' }}
                />

                {/* Laser sweep overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="scanner-laser" />
                    {/* Corner brackets to guide alignment */}
                    <div className="absolute inset-[15%] border-2 border-emerald-500/60 rounded-md" style={{ borderStyle: 'solid' }}>
                      <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                      <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
                    </div>
                  </div>
                )}

                {/* Loading overlay before camera starts */}
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-2">
                    <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
                    <p className="text-xs text-slate-300 font-semibold">{statusMsg}</p>
                  </div>
                )}
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] text-slate-400">
                  {isScanning ? 'Centra el código de barras en el recuadro verde' : statusMsg}
                </p>
                <button
                  onClick={() => setUseFrontCamera((v) => !v)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {useFrontCamera ? 'Trasera' : 'Frontal'}
                </button>
              </div>

              {/* Tips */}
              {isScanning && (
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">Consejos para una detección rápida:</p>
                  <p>• Mantén el código de barras <b>horizontal</b> y bien iluminado</p>
                  <p>• Acércate a ~15-20 cm del producto</p>
                  <p>• Evita reflejos de luz directa sobre el código</p>
                </div>
              )}

              {/* Error */}
              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="mt-1.5 text-emerald-400 font-bold underline"
                    >
                      Introducir código manualmente →
                    </button>
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* ── Manual input ─────────────────────────────────── */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Número de código de barras (EAN-13, EAN-8, UPC…):
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ej. 8480000210214"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="flex-1 px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleManualSearch()}
                    disabled={!manualBarcode.trim()}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2">
                <p className="text-xs font-bold text-slate-300">Productos de prueba:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_BARCODES.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => { setManualBarcode(s.code); handleManualSearch(s.code); }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-white/5 text-left transition group"
                    >
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
