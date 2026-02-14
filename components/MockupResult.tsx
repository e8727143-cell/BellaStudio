import React from 'react';
import { Button } from './Button';

interface MockupResultProps {
  resultImage: string;
  onReset: () => void;
}

export const MockupResult: React.FC<MockupResultProps> = ({ resultImage, onReset }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `mockup-calzado-bella-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white dark:bg-brand-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center animate-fade-in h-full transition-colors duration-300">
      <div className="flex items-center gap-2 mb-6 shrink-0 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-full">
        <span className="text-lg">✨</span>
        <h3 className="font-sans font-bold text-brand-green dark:text-green-400">Mockup Profesional Listo</h3>
      </div>

      <div className="relative w-full flex-grow flex items-center justify-center bg-[#F5F5F0] dark:bg-[#121212] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner min-h-[450px]">
        {/* Usamos object-contain para asegurar que se vea el formato completo (1:1, 4:5 o 9:16) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={resultImage} 
          alt="Mockup Generado" 
          className="max-w-full max-h-[600px] w-auto h-auto object-contain shadow-2xl rounded-sm transition-transform duration-500 hover:scale-[1.02]" 
        />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full justify-center shrink-0">
        <Button onClick={handleDownload} variant="primary" className="w-full sm:w-auto shadow-xl shadow-brand-green/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Descargar Imagen HD
        </Button>
        
        <Button onClick={onReset} variant="outline" className="w-full sm:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:text-brand-green dark:hover:border-brand-green">
          Crear Nuevo
        </Button>
      </div>
    </div>
  );
};