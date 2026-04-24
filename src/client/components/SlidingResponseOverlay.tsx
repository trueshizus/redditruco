import { useTranslation } from '../hooks/useTranslation';

interface SlidingResponseOverlayProps {
  isVisible: boolean;
  onQuiero: () => void;
  onNoQuiero: () => void;
  // Envido-at-truco: the responder may answer a truco with envido (any
  // flavor) instead of quiero/no-quiero. Buttons render when truly legal.
  canInterruptWithEnvido?: boolean;
  onInterruptWithEnvido?: () => void;
  onInterruptWithRealEnvido?: () => void;
  onInterruptWithFaltaEnvido?: () => void;
  // Counter-raise on a truco (Retruco / Vale Cuatro).
  canCallRetruco?: boolean;
  canCallValeCuatro?: boolean;
  onRetruco?: () => void;
  onValeCuatro?: () => void;
}

export const SlidingResponseOverlay = ({
  isVisible,
  onQuiero,
  onNoQuiero,
  canInterruptWithEnvido = false,
  onInterruptWithEnvido,
  onInterruptWithRealEnvido,
  onInterruptWithFaltaEnvido,
  canCallRetruco = false,
  canCallValeCuatro = false,
  onRetruco,
  onValeCuatro,
}: SlidingResponseOverlayProps) => {
  const { t } = useTranslation();
  if (!isVisible) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-all duration-300 ease-out" />

      <div className="fixed inset-x-0 bottom-0 z-50 transition-all duration-400 ease-out transform translate-y-0 opacity-100">
        <div className="bg-gradient-to-t from-slate-950/98 to-slate-900/98 backdrop-blur-xl px-4 py-4 border-t border-yellow-500/50 shadow-2xl space-y-3">
          <div className="animate-slide-up">
            <div className="text-yellow-200 text-sm font-medium mb-3 text-center">
              {t.response.required}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                data-testid="action-QUIERO"
                onClick={onQuiero}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-5 px-6 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {t.response.quiero}
              </button>
              <button
                data-testid="action-NO_QUIERO"
                onClick={onNoQuiero}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-5 px-6 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {t.response.noQuiero}
              </button>
            </div>
          </div>

          {(canCallRetruco || canCallValeCuatro) && (
            <div className="grid grid-cols-1 gap-2">
              {canCallRetruco && onRetruco && (
                <button
                  data-testid="action-CALL_RETRUCO"
                  onClick={onRetruco}
                  className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white py-3 px-4 rounded-lg text-base font-semibold shadow-lg transition-all duration-200"
                >
                  {t.response.quieroRetruco}
                </button>
              )}
              {canCallValeCuatro && onValeCuatro && (
                <button
                  data-testid="action-CALL_VALE_CUATRO"
                  onClick={onValeCuatro}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 px-4 rounded-lg text-base font-semibold shadow-lg transition-all duration-200"
                >
                  {t.response.quieroValeCuatro}
                </button>
              )}
            </div>
          )}

          {canInterruptWithEnvido && (
            <div>
              <div className="text-yellow-200/80 text-xs mb-2 text-center">
                {t.response.envidoEstaPrimero}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {onInterruptWithEnvido && (
                  <button
                    data-testid="action-CALL_ENVIDO"
                    onClick={onInterruptWithEnvido}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  >
                    {t.response.envido}
                  </button>
                )}
                {onInterruptWithRealEnvido && (
                  <button
                    data-testid="action-CALL_REAL_ENVIDO"
                    onClick={onInterruptWithRealEnvido}
                    className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  >
                    {t.response.realEnvido}
                  </button>
                )}
                {onInterruptWithFaltaEnvido && (
                  <button
                    data-testid="action-CALL_FALTA_ENVIDO"
                    onClick={onInterruptWithFaltaEnvido}
                    className="bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  >
                    {t.response.faltaEnvido}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-safe-area-inset-bottom bg-slate-950/98"></div>
      </div>
    </>
  );
};
