import React, { useRef, useState } from 'react';
import { Button } from './Button';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  selectedImage: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageSelected, 
  selectedImage, 
  onClear,
  disabled 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  if (selectedImage) {
    return (
      <div className="w-full bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center animate-fade-in transition-colors duration-300">
        <div className="flex items-center justify-between w-full mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white">Foto Original</h3>
          <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-md">Cargada</span>
        </div>
        
        <div className="relative w-full h-[300px] overflow-hidden rounded-xl bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700">
           {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedImage} alt="Original Shoe" className="object-contain max-h-full max-w-full p-4 drop-shadow-md" />
        </div>
        
        <div className="mt-6 w-full">
            <Button variant="outline" onClick={onClear} disabled={disabled} className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:text-brand-green dark:hover:border-brand-green">
              Cambiar Imagen
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full min-h-[350px] bg-white dark:bg-brand-card rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 cursor-pointer group relative overflow-hidden
        ${isDragging 
          ? 'border-brand-green bg-green-50/50 dark:bg-green-900/10 scale-[1.01]' 
          : 'border-gray-300 dark:border-gray-600 hover:border-brand-green hover:bg-gray-50/50 dark:hover:bg-gray-700/50'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
      />
      
      <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6 text-brand-green group-hover:scale-110 transition-transform duration-300 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      <h3 className="font-serif text-2xl text-gray-800 dark:text-white mb-3 text-center">Sube la foto del calzado</h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8 leading-relaxed">
        Arrastra y suelta tu archivo aquí o haz clic para explorar. 
        <br/><span className="text-xs text-gray-400 dark:text-gray-500 mt-2 block">Soporta JPG, PNG, WEBP</span>
      </p>
      
      <Button variant="primary" disabled={disabled} onClick={(e) => {
        e.stopPropagation();
        fileInputRef.current?.click();
      }}>
        Seleccionar Archivo
      </Button>
    </div>
  );
};