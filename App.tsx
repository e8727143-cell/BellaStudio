import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { MockupResult } from './components/MockupResult';
import { Button } from './components/Button';
import { StageSelector } from './components/StageSelector';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { generateShoeMockup, checkAllKeys, KeyStatus } from './services/geminiService';
import { AppStatus } from './types';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [aspectRatio, setAspectRatio] = useState<string>("4:5");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Diagnostic State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([]);
  const [isCheckingKeys, setIsCheckingKeys] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleImageSelected = (file: File) => {
    setSourceFile(file);
    setStatus(AppStatus.IDLE);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleTemplateSelected = (file: File) => {
    setTemplateFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setTemplatePreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSourceFile(null);
    setPreviewUrl(null);
    setGeneratedImageUrl(null);
    setStatus(AppStatus.IDLE);
    setErrorMsg(null);
  };

  const handleGenerate = async () => {
    if (!sourceFile) return;

    setStatus(AppStatus.PROCESSING);
    setErrorMsg(null);

    try {
      const resultUrl = await generateShoeMockup(
        sourceFile, 
        templateFile || undefined,
        aspectRatio
      );
      setGeneratedImageUrl(resultUrl);
      setStatus(AppStatus.SUCCESS);
    } catch (error: any) {
      console.error("Error completo capturado en App:", error);
      setStatus(AppStatus.ERROR);
      
      const message = error.message || "Error desconocido";
      setErrorMsg(message);
    }
  };

  const runDiagnostics = async () => {
    setIsCheckingKeys(true);
    setKeyStatuses([]);
    try {
      const results = await checkAllKeys();
      setKeyStatuses(results);
    } finally {
      setIsCheckingKeys(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'bg-brand-dark text-white' : 'bg-[#FAFAFA] text-gray-900'}`}>
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      
      {/* Visual Debug Indicator - Click to Open Diagnostics */}
      <button 
        onClick={() => { setShowDiagnostics(!showDiagnostics); if(!showDiagnostics && keyStatuses.length === 0) runDiagnostics(); }}
        className="bg-brand-green/20 text-brand-green text-xs font-mono text-center py-1 w-full hover:bg-brand-green/30 cursor-pointer transition-colors"
      >
        v2.8 - Diagnóstico Secuencial (Más seguro)
      </button>

      {/* DIAGNOSTIC PANEL */}
      {showDiagnostics && (
        <div className="bg-gray-900 text-gray-300 p-4 font-mono text-xs border-b border-gray-700 max-h-60 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-white font-bold">ESTADO DE API KEYS ({keyStatuses.length})</h3>
             <button onClick={runDiagnostics} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500" disabled={isCheckingKeys}>
               {isCheckingKeys ? 'Testeando...' : 'Re-Escanear'}
             </button>
          </div>
          {isCheckingKeys && keyStatuses.length === 0 && <div className="animate-pulse">Testeando conectividad (una por una)...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {keyStatuses.map((k, i) => (
              <div key={i} className={`p-2 border rounded flex items-center justify-between ${k.status === 'ok' ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'}`}>
                <div>
                  <span className="opacity-50">...{k.key.slice(-4)}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span>{k.latency}ms</span>
                   {k.status === 'ok' ? (
                     <span className="text-green-500 font-bold">OK</span>
                   ) : (
                     <span className="text-red-500 font-bold" title={k.message}>FAIL</span>
                   )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[10px] text-gray-500">
            * Nota: Si fallan, intenta mañana. El límite gratuito es diario (Pacific Time).
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <StageSelector 
              onTemplateSelected={handleTemplateSelected}
              currentTemplate={templatePreviewUrl}
              onFormatChange={setAspectRatio}
            />
            <AspectRatioSelector 
              value={aspectRatio}
              onChange={setAspectRatio}
              disabled={status === AppStatus.PROCESSING}
            />
            <ImageUploader 
              onImageSelected={handleImageSelected} 
              selectedImage={previewUrl}
              onClear={handleClear}
              disabled={status === AppStatus.PROCESSING}
            />

            {sourceFile && status !== AppStatus.SUCCESS && (
              <div className="bg-white dark:bg-brand-card p-6 rounded-2xl shadow-lg border border-brand-accent/20 dark:border-brand-accent/10 animate-fade-in relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent"></div>
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent text-xl shrink-0">
                        ⚡️
                     </div>
                     <div>
                       <h4 className="font-bold text-gray-900 dark:text-white text-lg">Todo Listo</h4>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                         {templateFile 
                           ? `1. Eliminando cajas  2. Ajustando luces  3. Formato ${aspectRatio}` 
                           : `1. Generando escena Bella  2. Integrando calzado  3. Formato ${aspectRatio}`}
                       </p>
                     </div>
                  </div>
                  
                  {errorMsg && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm border border-red-100 dark:border-red-800 flex items-start gap-3 shadow-sm break-all">
                      <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <div className="flex-1">
                        <span className="font-bold block mb-1">Error del Sistema:</span>
                        <span className="opacity-90">{errorMsg}</span>
                        {errorMsg.includes('429') && (
                          <button onClick={() => setShowDiagnostics(true)} className="block mt-2 text-xs underline font-bold">
                            Abrir Diagnóstico de Keys
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleGenerate} 
                    isLoading={status === AppStatus.PROCESSING}
                    className="w-full text-lg shadow-xl shadow-brand-green/20 py-4"
                  >
                    Generar Mockup Mágico
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[600px]">
             {status === AppStatus.SUCCESS && generatedImageUrl ? (
                <MockupResult 
                  resultImage={generatedImageUrl} 
                  onReset={handleClear}
                />
             ) : (
                <div className={`
                  w-full h-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-12 text-center relative overflow-hidden transition-all duration-500
                  ${status === AppStatus.PROCESSING 
                    ? 'bg-gray-50 dark:bg-brand-card/50 border-brand-green/30' 
                    : 'bg-white dark:bg-brand-card border-gray-200 dark:border-gray-700'}
                `}>
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/leaves.png')] dark:invert"></div>
                  {status === AppStatus.PROCESSING ? (
                    <div className="z-10 flex flex-col items-center animate-pulse">
                       <div className="w-24 h-24 rounded-full border-4 border-brand-green border-t-brand-accent animate-spin mb-8"></div>
                       <h3 className="font-serif text-3xl text-brand-green mb-3">
                         {templateFile ? "Componiendo Escena..." : "Imaginando Espacio..."}
                       </h3>
                       <p className="text-gray-500 dark:text-gray-400 max-w-sm text-lg">
                         Eliminando cajas, ajustando sombras y renderizando en formato {aspectRatio}.
                       </p>
                    </div>
                  ) : (
                    <div className="z-10 max-w-md opacity-40 hover:opacity-60 transition-opacity duration-300">
                      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-400 dark:text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="font-serif text-3xl text-gray-400 dark:text-gray-500 mb-3">Vista Previa</h3>
                      <p className="text-gray-400 dark:text-gray-500">
                        El resultado final aparecerá aquí con la calidad de estudio seleccionada.
                      </p>
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>
      </main>
      <footer className="bg-white dark:bg-brand-card py-8 border-t border-gray-100 dark:border-gray-800 mt-auto transition-colors duration-300">
        <div className="container mx-auto px-4 text-center">
           <p className="text-gray-400 text-sm font-medium">
             &copy; {new Date().getFullYear()} Estudio Virtual Bella. Todos los derechos reservados.
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;