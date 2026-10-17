'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ScanBarcode,
  Camera,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Flame,
  ArrowRight,
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

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'lunch',
  onAddFood,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [scannedProduct, setScannedProduct] = useState<FoodItem | null>(null);
  const [servingGrams, setServingGrams] = useState<number>(100);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMealType);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-scanner-element';

  // Sample barcodes for quick testing on desktop without webcam
  const SAMPLE_BARCODES = [
    { code: '3017620422003', label: 'Nutella Ferrero' },
    { code: '5449000000996', label: 'Coca-Cola Zero' },
    { code: '7622210449283', label: 'Oreo Galletas' },
    { code: '8480000210214', label: 'Avena Hacendado' },
  ];

  // Stop scanner utility
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Start scanner
  const startScanner = async () => {
    setCameraError(null);
    await stopScanner();

    // Check if element is mounted
    const elem = document.getElementById(scannerContainerId);
    if (!elem) return;

    try {
      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          console.log('Barcode detected:', decodedText);
          await handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame callback, silent
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Failed to start camera scanner:', err);
      setCameraError(
        err?.message || 'No se pudo acceder a la cámara. Revisa los permisos o usa la búsqueda manual.'
      );
      setIsScanning(false);
    }
  };

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
      setCameraError(`Producto con código "${barcode}" no encontrado en Open Food Facts.`);
    }
  };

  const handleManualSearch = async (codeToSearch?: string) => {
    const code = codeToSearch || manualBarcode;
    if (!code) return;
    await stopScanner();
    await handleBarcodeDetected(code);
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedProduct) {
      // Delay to ensure DOM element is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, facingMode, scannedProduct]);

  useEffect(() => {
    setSelectedMeal(defaultMealType);
  }, [defaultMealType]);

  if (!isOpen) return null;

  const handleConfirmAdd = () => {
    if (!scannedProduct) return;
    onAddFood(selectedMeal, scannedProduct, Math.max(1, servingGrams));
    onClose();
    setScannedProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Escáner de Alimentos</h2>
              <p className="text-[11px] text-slate-400">Open Food Facts Database</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers if no product yet */}
        {!scannedProduct && (
          <div className="flex p-2 bg-slate-900/50 border-b border-white/5">
            <button
              onClick={() => {
                setActiveTab('camera');
                setCameraError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'camera'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara en Vivo</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                stopScanner();
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'manual'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Código Manual</span>
            </button>
          </div>
        )}

        {/* Content body */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLookingUp ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-200">Consultando Open Food Facts...</p>
              <p className="text-xs text-slate-400">Obteniendo macros y valores por 100g</p>
            </div>
          ) : scannedProduct ? (
            /* Product Result Card */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-start space-x-3">
                {scannedProduct.image_url ? (
                  <img
                    src={scannedProduct.image_url}
                    alt={scannedProduct.name}
                    className="w-16 h-16 object-cover rounded-xl bg-slate-800 border border-white/5"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600">
                    <ScanBarcode className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {scannedProduct.brand || 'Producto'}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate">{scannedProduct.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Barcode: <span className="font-mono text-slate-300">{scannedProduct.barcode}</span>
                  </p>
                </div>
              </div>

              {/* Nutrition per 100g */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400">Kcal / 100g</p>
                  <p className="text-sm font-bold text-emerald-400">{scannedProduct.calories_100g}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400">Proteína</p>
                  <p className="text-sm font-bold text-rose-400">{scannedProduct.protein_100g}g</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400">Carbos</p>
                  <p className="text-sm font-bold text-sky-400">{scannedProduct.carbs_100g}g</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400">Grasas</p>
                  <p className="text-sm font-bold text-amber-400">{scannedProduct.fat_100g}g</p>
                </div>
              </div>

              {/* Portion Selector */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Porción a registrar:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={servingGrams}
                      onChange={(e) => setServingGrams(Number(e.target.value))}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-400">gramos</span>
                  </div>
                  {/* Quick gram buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[50, 100, 150, 200].map((g) => (
                      <button
                        key={g}
                        onClick={() => setServingGrams(g)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                          servingGrams === g
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Type Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Comida de destino:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => {
                      const labels: Record<MealType, string> = {
                        breakfast: 'Desayuno',
                        lunch: 'Almuerzo',
                        dinner: 'Cena',
                        snack: 'Snack',
                      };
                      return (
                        <button
                          key={m}
                          onClick={() => setSelectedMeal(m)}
                          className={`py-1.5 px-1 text-[11px] font-semibold rounded-xl border text-center transition ${
                            selectedMeal === m
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                              : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                          }`}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calculated Totals for this Serving */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">Total para {servingGrams}g:</span>
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-white">
                      {Math.round((scannedProduct.calories_100g * servingGrams) / 100)} kcal
                    </span>
                    <span className="text-rose-400">
                      {Math.round(((scannedProduct.protein_100g * servingGrams) / 100) * 10) / 10}g P
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => {
                    setScannedProduct(null);
                    setActiveTab('camera');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                >
                  Volver a escanear
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Añadir a mi Diario</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'camera' ? (
            /* Live Camera Scanner */
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-square max-h-[320px] mx-auto flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Laser animation overlay */}
                {isScanning && <div className="scanner-laser" />}

                {/* Framing guides */}
                <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-emerald-400/40 rounded-xl" />

                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/80">
                    <Camera className="w-8 h-8 text-emerald-400 animate-pulse mb-2" />
                    <p className="text-xs text-slate-300 font-semibold">Iniciando cámara web...</p>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="flex items-center justify-between text-xs px-1">
                <p className="text-[11px] text-slate-400">Apunta la cámara al código de barras del producto</p>
                <button
                  onClick={toggleCameraFacing}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center gap-1"
                  title="Cambiar cámara"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Girar</span>
                </button>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="mt-1 text-emerald-400 underline font-semibold"
                    >
                      Usar búsqueda por código manual
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Manual Barcode Input & Test Barcodes */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Introduce el número de código de barras:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ej. 8480000210214"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleManualSearch()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {/* Sample Quick Barcodes */}
              <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2">
                <p className="text-xs font-bold text-slate-300">Códigos de prueba rápidos:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_BARCODES.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => {
                        setManualBarcode(s.code);
                        handleManualSearch(s.code);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-white/5 text-left transition group"
                    >
                      <p className="text-xs font-semibold text-white group-hover:text-emerald-400">
                        {s.label}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">{s.code}</p>
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
