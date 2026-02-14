import React from 'react';

interface AspectRatioSelectorProps {
  value: string;
  onChange: (ratio: string) => void;
  disabled?: boolean;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ value, onChange, disabled }) => {
  const ratios = [
    { 
      id: '1:1', 
      label: 'Cuadrado', 
      sub: '1080x1080', 
      icon: 'M4 4h16v16H4z' 
    },
    { 
      id: '4:5', 
      label: 'Post Vertical', 
      sub: '1080x1350', 
      icon: 'M5 3h14v18H5z' 
    }, 
    { 
      id: '9:16', 
      label: 'Historia / Reel', 
      sub: '1080x1920', 
      icon: 'M6 2h12v20H6z' 
    },
  ];

  return (
    <div className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-300">
      <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Formato de Salida
      </h3>
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {ratios.map((ratio) => (
          <button
            key={ratio.id}
            onClick={() => onChange(ratio.id)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all duration-200 group
              ${value === ratio.id 
                ? 'border-brand-green bg-green-50/50 dark:bg-green-900/20 text-brand-green shadow-sm' 
                : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <svg className={`w-6 h-6 mb-2 transition-transform duration-300 group-hover:scale-110 ${value === ratio.id ? 'fill-brand-green' : 'fill-gray-400 dark:fill-gray-500'}`} viewBox="0 0 24 24">
              <path d={ratio.icon} />
            </svg>
            <span className="text-sm font-bold whitespace-nowrap">{ratio.label}</span>
            <span className="text-[10px] uppercase tracking-wide opacity-60 font-medium mt-1">{ratio.sub}</span>
            
            {value === ratio.id && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-brand-green rounded-full shadow-sm"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};