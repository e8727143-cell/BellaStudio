import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface StageSelectorProps {
  onTemplateSelected: (file: File) => void;
  currentTemplate: string | null;
  onFormatChange: (ratio: string) => void;
}

interface Template {
  id: number;
  name: string;
  image_url: string;
}

// Fallback templates
const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 101,
    name: 'Post Vertical (4:5)',
    image_url: 'https://njxodvldycdindlrpund.supabase.co/storage/v1/object/public/scenarios/Escenario%20post%20vertical.jpg'
  },
  {
    id: 102,
    name: 'Post Cuadrado (1:1)',
    image_url: 'https://njxodvldycdindlrpund.supabase.co/storage/v1/object/public/scenarios/Escenario%20post%20cuadrado.jpg'
  },
  {
    id: 103,
    name: 'Historia / Reel (9:16)',
    image_url: 'https://njxodvldycdindlrpund.supabase.co/storage/v1/object/public/scenarios/Escenario%20post%20historia%20o%20reel.jpg'
  }
];

export const StageSelector: React.FC<StageSelectorProps> = ({ onTemplateSelected, currentTemplate, onFormatChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  
  const [isExpanded, setIsExpanded] = useState(true); // Default open to show carousel
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('id', { ascending: false });
      
      if (data && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(FALLBACK_TEMPLATES);
      }
    } catch (error) {
      console.error('Error fetching templates, using fallback:', error);
      setTemplates(FALLBACK_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Auto-scroll to center when an item is selected
  useEffect(() => {
    if (selectedId && itemsRef.current.has(selectedId)) {
      const element = itemsRef.current.get(selectedId);
      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedId]);

  const detectAndSetFormat = (name: string) => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('vertical') || lowerName.includes('4:5')) {
      onFormatChange('4:5');
    } else if (lowerName.includes('historia') || lowerName.includes('reel') || lowerName.includes('9:16') || lowerName.includes('story')) {
      onFormatChange('9:16');
    } else {
      // Default to 1:1 if it says "cuadrado" or nothing specific
      onFormatChange('1:1');
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    setDownloadingId(template.id);
    setSelectedId(template.id);
    
    // Auto-select Format based on name
    detectAndSetFormat(template.name);

    try {
      const response = await fetch(template.image_url);
      if (!response.ok) throw new Error("No se pudo descargar la imagen");
      
      const blob = await response.blob();
      const file = new File([blob], `${template.name}.jpg`, { type: blob.type });
      
      onTemplateSelected(file);
      // setIsExpanded(false); // Keep open to show selection state
    } catch (err) {
      console.error("Error downloading template image", err);
      alert(`No se pudo cargar el escenario: ${template.name}.`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer bg-gray-50/50 dark:bg-gray-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-lg transition-colors ${currentTemplate ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'}`}>
            {/* Nuevo icono 3D Gallery Elegante */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 4h8a2 2 0 012 2v1m-10-3v1m-2 0h14" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Galería de Escenarios</h3>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 animate-fade-in bg-white dark:bg-brand-card">
          <div className="flex items-center justify-between mb-2">
             <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Elige tu escenario y su tamaño</h4>
             <button 
                onClick={(e) => { e.stopPropagation(); fetchTemplates(); }} 
                className="text-xs text-brand-green hover:underline flex items-center gap-1"
                disabled={loading}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
             </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
               <svg className="animate-spin h-8 w-8 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            </div>
          ) : templates.length > 0 ? (
            <div className="w-full">
               {/* 
                 CAROUSEL CONTAINER 
                 - Centered Flex
                 - Padding to allow first/last items to be centered (approx 35% padding)
               */}
              <div 
                ref={containerRef}
                className="flex items-center overflow-x-auto gap-4 md:gap-8 py-10 px-[30%] snap-x snap-mandatory scrollbar-hide no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {templates.map((t) => {
                  const isSelected = selectedId === t.id || (selectedId === null && currentTemplate?.includes(t.image_url));
                  
                  return (
                    <div 
                      key={t.id} 
                      ref={(el) => { if (el) itemsRef.current.set(t.id, el); }}
                      onClick={() => handleSelectTemplate(t)}
                      className={`
                        snap-center flex-shrink-0 relative transition-all duration-500 ease-out cursor-pointer
                        w-40 h-40 md:w-56 md:h-56 rounded-2xl
                        ${isSelected 
                          ? 'scale-110 z-20 opacity-100 shadow-2xl ring-4 ring-brand-green/30' 
                          : 'scale-90 z-10 opacity-50 blur-[1.5px] grayscale-[0.3] hover:opacity-90 hover:blur-0 hover:scale-95 hover:grayscale-0'}
                      `}
                    >
                        {/* Wrapper for Image to ensure SQUARE aspect ratio */}
                        <div className="w-full h-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-700 shadow-inner">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={t.image_url} 
                              alt={t.name} 
                              className="w-full h-full object-cover" 
                            />
                        </div>
                        
                        {/* Overlay Text - Only visible when selected or hovered */}
                        <div className={`
                          absolute -bottom-8 inset-x-0 text-center transition-opacity duration-300
                          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                        `}>
                            <p className="text-gray-600 font-bold text-xs uppercase tracking-wider bg-white/80 dark:bg-black/70 dark:text-white backdrop-blur-sm px-2 py-1 rounded-full inline-block shadow-sm">
                                {t.name}
                            </p>
                        </div>

                        {downloadingId === t.id && (
                           <div className="absolute inset-0 z-30 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                              <svg className="animate-spin h-8 w-8 text-brand-green" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
             <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron escenarios.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};