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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md">
        <div className="flex items-center mb-4">
          <FiAlertCircle className="text-yellow-500 text-2xl mr-3" />
          <h3 className="text-lg font-semibold">Approaching Object Limit</h3>
        </div>
        <p className="text-gray-600 mb-4">
          You have created {objectCount} objects out of 5000 maximum.
          Consider removing some objects or ending the session soon.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
