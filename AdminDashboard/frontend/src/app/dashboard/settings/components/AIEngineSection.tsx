'use client';

import { Button, Card, CardHeader } from '@/components/ui';
import { useState } from 'react';

export function AIEngineSection() {
  const [settings, setSettings] = useState({
    confidenceThreshold: 75,
    batchSize: 32,
    modelVersion: 'v2.1.0',
  });

  return (
    <Card id="ai-engine">
      <CardHeader
        title="AI Engine Parameters"
        subtitle="Adjust the sensitivity and behavior of crop analysis"
      />

      <div className="mt-6 space-y-6">
        {/* Confidence Threshold */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-neutral">
              Confidence Threshold
            </label>
            <span className="text-sm font-medium text-primary">
              {settings.confidenceThreshold}%
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            value={settings.confidenceThreshold}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                confidenceThreshold: parseInt(e.target.value),
              }))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="mt-1 text-xs text-neutral-lighter">
            Minimum confidence level for displaying diagnosis results to farmers
          </p>
        </div>

        {/* Batch Size */}
        <div>
          <label className="block text-sm font-medium text-neutral mb-2">
            Batch Processing Size
          </label>
          <select
            value={settings.batchSize}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                batchSize: parseInt(e.target.value),
              }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={16}>16 images</option>
            <option value={32}>32 images</option>
            <option value={64}>64 images</option>
          </select>
          <p className="mt-1 text-xs text-neutral-lighter">
            Number of images to process simultaneously
          </p>
        </div>

        {/* Model Version */}
        <div>
          <label className="block text-sm font-medium text-neutral mb-2">
            Active Model Version
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={settings.modelVersion}
              readOnly
              className="flex-1 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-neutral-light"
            />
            <Button variant="outline" size="sm">
              View Changelog
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Apply Changes</Button>
        </div>
      </div>
    </Card>
  );
}
