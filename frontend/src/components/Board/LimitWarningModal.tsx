import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

interface LimitWarningModalProps {
  show: boolean;
  objectCount: number;
  onDismiss: () => void;
}

export const LimitWarningModal: React.FC<LimitWarningModalProps> = ({
  show,
  objectCount,
  onDismiss
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-amber-200 shadow-[0_24px_80px_rgba(15,23,42,0.3)]">
        <div className="flex items-center mb-4">
          <FiAlertCircle className="text-amber-500 text-2xl mr-3" />
          <h3 className="text-lg font-semibold text-slate-900">Approaching Object Limit</h3>
        </div>
        <p className="text-slate-600 mb-4">
          You have created {objectCount} objects out of 5000 maximum.
          Consider removing some objects or ending the session soon.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
