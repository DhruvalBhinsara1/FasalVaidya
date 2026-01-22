/**
 * Comparison Chart Component
 * ===========================
 * Displays a bar chart comparing current vs previous scan nutrient levels
 * Uses react-native-svg for chart rendering
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { getCurrentLanguage } from '../i18n';
import { borderRadius, colors, spacing } from '../theme';

interface DatasetItem {
  label: string;
  data: number[];
  color: string;
}

interface BarChartData {
  type: string;
  labels: string[];
  datasets: DatasetItem[];
  error?: string;
}

interface ComparisonChartProps {
  barChartData?: BarChartData;
  title?: string;
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 200;
const BAR_WIDTH = 35;
const GROUP_GAP = 50;
const MARGIN_LEFT = 40;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 40;

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  barChartData,
  title
}) => {
  const isHindi = getCurrentLanguage() === 'hi';
  
  // Check if we have valid data
  if (!barChartData || barChartData.error || !barChartData.datasets?.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>
          {isHindi 
            ? 'तुलना के लिए पिछला स्कैन आवश्यक है' 
            : 'Previous scan needed for comparison'}
        </Text>
      </View>
    );
  }

  const { labels, datasets } = barChartData;
  const maxValue = 100; // Max health percentage
  const chartableHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  
  // Calculate bar positions
  const getBarX = (groupIndex: number, datasetIndex: number) => {
    const groupX = MARGIN_LEFT + groupIndex * (BAR_WIDTH * 2 + GROUP_GAP);
    return groupX + datasetIndex * (BAR_WIDTH + 4);
  };
  
  const getBarHeight = (value: number) => {
    return (value / maxValue) * chartableHeight;
  };
  
  const getBarY = (value: number) => {
    return MARGIN_TOP + chartableHeight - getBarHeight(value);
  };

  // Nutrient labels in Hindi
  const getNutrientLabel = (label: string): string => {
    if (!isHindi) return label;
    const translations: Record<string, string> = {
      'Nitrogen': 'नाइट्रोजन (N)',
      'Phosphorus': 'फॉस्फोरस (P)',
      'Potassium': 'पोटैशियम (K)'
    };
    return translations[label] || label;
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {/* Legend */}
      <View style={styles.legend}>
        {datasets.map((dataset, idx) => (
          <View key={idx} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: dataset.color }]} />
            <Text style={styles.legendText}>
              {dataset.label === 'Previous' 
                ? (isHindi ? 'पिछला' : 'Previous') 
                : (isHindi ? 'वर्तमान' : 'Current')}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y-axis */}
          <Line
            x1={MARGIN_LEFT - 5}
            y1={MARGIN_TOP}
            x2={MARGIN_LEFT - 5}
            y2={CHART_HEIGHT - MARGIN_BOTTOM}
            stroke={colors.border}
            strokeWidth={1}
          />
          
          {/* X-axis */}
          <Line
            x1={MARGIN_LEFT - 5}
            y1={CHART_HEIGHT - MARGIN_BOTTOM}
            x2={CHART_WIDTH - 10}
            y2={CHART_HEIGHT - MARGIN_BOTTOM}
            stroke={colors.border}
            strokeWidth={1}
          />
          
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((value, idx) => (
            <G key={`y-${idx}`}>
              <SvgText
                x={MARGIN_LEFT - 10}
                y={getBarY(value) + 4}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {value}
              </SvgText>
              <Line
                x1={MARGIN_LEFT - 5}
                y1={getBarY(value)}
                x2={CHART_WIDTH - 10}
                y2={getBarY(value)}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            </G>
          ))}
          
          {/* Bars */}
          {labels.map((label, groupIdx) => (
            <G key={`group-${groupIdx}`}>
              {datasets.map((dataset, datasetIdx) => {
                const value = dataset.data[groupIdx] || 0;
                const barX = getBarX(groupIdx, datasetIdx);
                const barY = getBarY(value);
                const barHeight = getBarHeight(value);
                
                return (
                  <G key={`bar-${groupIdx}-${datasetIdx}`}>
                    <Rect
                      x={barX}
                      y={barY}
                      width={BAR_WIDTH}
                      height={barHeight}
                      fill={dataset.color}
                      rx={4}
                      ry={4}
                    />
                    {/* Value label on top of bar */}
                    <SvgText
                      x={barX + BAR_WIDTH / 2}
                      y={barY - 5}
                      fontSize={10}
                      fill={colors.textPrimary}
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {Math.round(value)}%
                    </SvgText>
                  </G>
                );
              })}
              
              {/* X-axis label */}
              <SvgText
                x={getBarX(groupIdx, 0) + BAR_WIDTH + 2}
                y={CHART_HEIGHT - MARGIN_BOTTOM + 20}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {label.charAt(0)}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
      
      {/* Nutrient labels below chart */}
      <View style={styles.nutrientLabels}>
        {labels.map((label, idx) => (
          <Text key={idx} style={styles.nutrientLabel}>
            {getNutrientLabel(label)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chartContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  noDataContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  nutrientLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  nutrientLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
});

export default ComparisonChart;
