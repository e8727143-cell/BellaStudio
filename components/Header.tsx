import React from 'react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  return (
    <header className="bg-white dark:bg-brand-card border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-6 py-4 relative flex items-center justify-between md:justify-center">
        
        {/* Title Centered */}
        <div className="flex items-center">
          <h1 className="font-serif text-2xl md:text-3xl text-gray-900 dark:text-white font-bold tracking-tight text-center">
            Bella<span className="text-brand-green">Studio</span>
          </h1>
        </div>
        
        {/* Right Section: Version & Theme Toggle */}
        <div className="absolute right-6 flex items-center gap-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all focus:outline-none"
            aria-label="Toggle Dark Mode"
          >
             {isDarkMode ? (
               // Sun Icon (for Dark Mode)
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
               </svg>
             ) : (
               // Moon Icon (for Light Mode)
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
               </svg>
             )}
          </button>
          
          <div className="hidden md:flex items-center text-sm font-medium text-gray-500">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-full text-xs uppercase tracking-wider text-gray-600 transition-colors duration-300">
              v2.0 Pro
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};