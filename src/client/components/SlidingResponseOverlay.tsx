interface SlidingResponseOverlayProps {
  isVisible: boolean;
  onQuiero: () => void;
  onNoQuiero: () => void;
}

export const SlidingResponseOverlay = ({ isVisible, onQuiero, onNoQuiero }: SlidingResponseOverlayProps) => {
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-all duration-300 ease-out" />

      {/* Sliding Response Section */}
      <div className="fixed inset-x-0 bottom-0 z-50 transition-all duration-400 ease-out transform translate-y-0 opacity-100">
        {/* Response Actions Overlay */}
        <div className="bg-gradient-to-t from-slate-950/98 to-slate-900/98 backdrop-blur-xl px-4 py-4 border-t border-yellow-500/50 shadow-2xl">
          <div className="animate-slide-up">
            <div className="text-yellow-200 text-sm font-medium mb-3 text-center">⚡ Response Required</div>
            <div className="grid grid-cols-2 gap-4">
              <button
                data-testid="action-QUIERO"
                onClick={onQuiero}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-5 px-6 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                ✓ Quiero
              </button>
              <button
                data-testid="action-NO_QUIERO"
                onClick={onNoQuiero}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-5 px-6 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                ✗ No Quiero
              </button>
            </div>
          </div>
        </div>
        
        {/* Safe area for mobile devices */}
        <div className="h-safe-area-inset-bottom bg-slate-950/98"></div>
      </div>
    </>
  );
};