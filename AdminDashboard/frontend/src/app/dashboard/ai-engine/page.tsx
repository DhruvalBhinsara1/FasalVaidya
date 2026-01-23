import { Header } from '@/components/layout/Header';
import { Badge, Button, Card, CardHeader } from '@/components/ui';

export default function AIEnginePage() {
  // Mock data for MVP - in production, fetch from ML backend
  const models = [
    {
      name: 'Unified V2 Model',
      version: 'v2.1.0',
      type: 'TensorFlow Lite',
      status: 'active',
      accuracy: '87.5%',
      lastUpdated: '2026-01-15',
      file: 'fasalvaidya_unified.tflite',
    },
    {
      name: 'EfficientNet-B0',
      version: 'v1.0.0',
      type: 'Keras',
      status: 'backup',
      accuracy: '85.2%',
      lastUpdated: '2025-12-20',
      file: 'efficientnet_best.keras',
    },
    {
      name: 'Leaf Validator',
      version: 'v1.2.0',
      type: 'TensorFlow Lite',
      status: 'active',
      accuracy: '92.1%',
      lastUpdated: '2026-01-10',
      file: 'leaf_validator.tflite',
    },
  ];

  const metrics = [
    { label: 'Total Predictions', value: '52,847' },
    { label: 'Avg Response Time', value: '245ms' },
    { label: 'Daily Predictions', value: '1,247' },
    { label: 'Error Rate', value: '0.3%' },
  ];

  return (
    <>
      <Header
        title="AI Engine"
        subtitle="Model management and performance monitoring"
      />

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <p className="text-sm text-neutral-light">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-neutral">{metric.value}</p>
            </Card>
          ))}
        </div>

        {/* Models Table */}
        <Card padding="none">
          <div className="p-6 pb-0">
            <CardHeader
              title="Deployed Models"
              subtitle="Active AI models for crop analysis"
              action={
                <Button variant="outline" size="sm">
                  Upload New Model
                </Button>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Model Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Accuracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {models.map((model) => (
                  <tr key={model.name} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-neutral">{model.name}</p>
                        <p className="text-xs text-neutral-lighter">{model.file}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral">
                      {model.version}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-light">
                      {model.type}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={model.status === 'active' ? 'success' : 'default'}
                      >
                        {model.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      {model.accuracy}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-light">
                      {model.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Model Performance */}
        <Card>
          <CardHeader
            title="Model Performance by Crop"
            subtitle="Accuracy breakdown per crop type"
          />
          <div className="mt-6 space-y-4">
            {[
              { crop: 'Tomato', accuracy: 92 },
              { crop: 'Rice', accuracy: 88 },
              { crop: 'Wheat', accuracy: 86 },
              { crop: 'Maize', accuracy: 84 },
              { crop: 'Banana', accuracy: 81 },
            ].map((item) => (
              <div key={item.crop}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral">{item.crop}</span>
                  <span className="text-neutral-light">{item.accuracy}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
