/**
 * Comparison Chart Component - Enhanced Version
 * ===============================================
 * Displays a modern, larger bar chart comparing current vs previous scan nutrient health
 * Uses react-native-svg for chart rendering with improved visual design
 * 
 * KEY: Values shown are HEALTH SCORES (0-100, higher = healthier)
 */

import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

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
  metadata?: {
    score_type?: string;
    scale?: string;
    changes?: Record<string, number>;
  };
  error?: string;
}

interface ComparisonChartProps {
  barChartData?: BarChartData;
  title?: string;
}

// Enhanced chart dimensions for better visibility
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);  // Larger, responsive width
const CHART_HEIGHT = 280;  // Increased height
const BAR_WIDTH = 45;  // Wider bars
const GROUP_GAP = 60;  // More spacing between groups
const MARGIN_LEFT = 50;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;
const MARGIN_RIGHT = 20;

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

  const { labels, datasets, metadata } = barChartData;
  const maxValue = 100; // Max health percentage
  const chartableHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  const chartableWidth = CHART_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  
  // Calculate bar positions with better centering
  const totalBarsWidth = labels.length * (BAR_WIDTH * 2 + 8) + (labels.length - 1) * GROUP_GAP;
  const startX = MARGIN_LEFT + (chartableWidth - totalBarsWidth) / 2;
  
  const getBarX = (groupIndex: number, datasetIndex: number) => {
    const groupX = startX + groupIndex * (BAR_WIDTH * 2 + 8 + GROUP_GAP);
    return groupX + datasetIndex * (BAR_WIDTH + 8);
  };
  
  const getBarHeight = (value: number) => {
    return Math.max(0, (value / maxValue) * chartableHeight);
  };
  
  const getBarY = (value: number) => {
    return MARGIN_TOP + chartableHeight - getBarHeight(value);
  };

  // Get health status color based on value
  const getHealthColor = (value: number): string => {
    if (value >= 70) return '#4C763B';  // Healthy - green
    if (value >= 50) return '#FA8112';  // Attention - orange
    return '#FF6363';  // Critical - red
  };

  // Nutrient labels in Hindi
  const getNutrientLabel = (label: string): string => {
    if (!isHindi) return label;
    const translations: Record<string, string> = {
      'Nitrogen': 'नाइट्रोजन',
      'Phosphorus': 'फॉस्फोरस',
      'Potassium': 'पोटैशियम'
    };
    return translations[label] || label;
  };

  // Get nutrient symbol
  const getNutrientSymbol = (label: string): string => {
    const symbols: Record<string, string> = {
      'Nitrogen': 'N',
      'Phosphorus': 'P',
      'Potassium': 'K'
    };
    return symbols[label] || label.charAt(0);
  };

  // Calculate change indicators
  const getChangeIndicator = (nutrientKey: string): string | null => {
    if (!metadata?.changes) return null;
    const change = metadata.changes[nutrientKey.toLowerCase()];
    if (change === undefined || change === 0) return null;
    return change > 0 ? `↑ ${change.toFixed(1)}%` : `↓ ${Math.abs(change).toFixed(1)}%`;
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          {isHindi 
            ? '📊 स्वास्थ्य स्कोर: 0-100 (अधिक = स्वस्थ)' 
            : '📊 Health Score: 0-100 (Higher = Healthier)'}
        </Text>
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        {datasets.map((dataset, idx) => (
          <View key={idx} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: dataset.color, marginRight: spacing.xs }]} />
            <Text style={styles.legendText}>
              {dataset.label === 'Previous' 
                ? (isHindi ? 'पिछला स्कैन' : 'Previous Scan') 
                : (isHindi ? 'वर्तमान स्कैन' : 'Current Scan')}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            {/* Gradient for current bars */}
            <LinearGradient id="currentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#5A8F45" stopOpacity="1" />
              <Stop offset="100%" stopColor="#4C763B" stopOpacity="1" />
            </LinearGradient>
            {/* Gradient for previous bars */}
            <LinearGradient id="previousGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#B0B7BE" stopOpacity="1" />
              <Stop offset="100%" stopColor="#9CA3AF" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {/* Y-axis */}
          <Line
            x1={MARGIN_LEFT}
            y1={MARGIN_TOP}
            x2={MARGIN_LEFT}
            y2={CHART_HEIGHT - MARGIN_BOTTOM}
            stroke={colors.border}
            strokeWidth={2}
          />
          
          {/* X-axis */}
          <Line
            x1={MARGIN_LEFT}
            y1={CHART_HEIGHT - MARGIN_BOTTOM}
            x2={CHART_WIDTH - MARGIN_RIGHT}
            y2={CHART_HEIGHT - MARGIN_BOTTOM}
            stroke={colors.border}
            strokeWidth={2}
          />
          
          {/* Y-axis labels and grid lines */}
          {[0, 25, 50, 75, 100].map((value, idx) => (
            <G key={`y-${idx}`}>
              <SvgText
                x={MARGIN_LEFT - 8}
                y={getBarY(value) + 4}
                fontSize={11}
                fontWeight="600"
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {value}
              </SvgText>
              {value > 0 && (
                <Line
                  x1={MARGIN_LEFT}
                  y1={getBarY(value)}
                  x2={CHART_WIDTH - MARGIN_RIGHT}
                  y2={getBarY(value)}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  opacity={0.3}
                />
              )}
            </G>
          ))}
          
          {/* Health zone lines */}
          <Line
            x1={MARGIN_LEFT}
            y1={getBarY(70)}
            x2={CHART_WIDTH - MARGIN_RIGHT}
            y2={getBarY(70)}
            stroke="#4C763B"
            strokeWidth={1.5}
            strokeDasharray="8,4"
            opacity={0.4}
          />
          <Line
            x1={MARGIN_LEFT}
            y1={getBarY(50)}
            x2={CHART_WIDTH - MARGIN_RIGHT}
            y2={getBarY(50)}
            stroke="#FA8112"
            strokeWidth={1.5}
            strokeDasharray="8,4"
            opacity={0.4}
          />
          
          {/* Bars with gradients and shadows */}
          {labels.map((label, groupIdx) => (
            <G key={`group-${groupIdx}`}>
              {datasets.map((dataset, datasetIdx) => {
                const value = dataset.data[groupIdx] || 0;
                const barX = getBarX(groupIdx, datasetIdx);
                const barY = getBarY(value);
                const barHeight = getBarHeight(value);
                const isCurrentDataset = dataset.label === 'Current';
                
                return (
                  <G key={`bar-${groupIdx}-${datasetIdx}`}>
                    {/* Shadow effect */}
                    <Rect
                      x={barX + 2}
                      y={barY + 2}
                      width={BAR_WIDTH}
                      height={barHeight}
                      fill="#000"
                      rx={6}
                      ry={6}
                      opacity={0.1}
                    />
                    {/* Main bar with gradient */}
                    <Rect
                      x={barX}
                      y={barY}
                      width={BAR_WIDTH}
                      height={Math.max(barHeight, 2)}
                      fill={isCurrentDataset ? "url(#currentGradient)" : "url(#previousGradient)"}
                      rx={6}
                      ry={6}
                    />
                    {/* Health status indicator on current bars */}
                    {isCurrentDataset && barHeight > 10 && (
                      <Rect
                        x={barX}
                        y={barY}
                        width={BAR_WIDTH}
                        height={8}
                        fill={getHealthColor(value)}
                        rx={6}
                        opacity={0.8}
                      />
                    )}
                    {/* Value label on top of bar */}
                    <SvgText
                      x={barX + BAR_WIDTH / 2}
                      y={barY - 8}
                      fontSize={13}
                      fontWeight="700"
                      fill={isCurrentDataset ? '#4C763B' : '#6B7280'}
                      textAnchor="middle"
                    >
                      {Math.round(value)}%
                    </SvgText>
                  </G>
                );
              })}
              
              {/* X-axis nutrient symbol */}
              <SvgText
                x={getBarX(groupIdx, 0) + BAR_WIDTH + 4}
                y={CHART_HEIGHT - MARGIN_BOTTOM + 22}
                fontSize={16}
                fontWeight="700"
                fill={colors.textPrimary}
                textAnchor="middle"
              >
                {getNutrientSymbol(label)}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
      
      {/* Nutrient labels with change indicators */}
      <View style={styles.nutrientLabels}>
        {labels.map((label, idx) => {
          const change = getChangeIndicator(label);
          return (
            <View key={idx} style={styles.nutrientLabelContainer}>
              <Text style={styles.nutrientLabel}>
                {getNutrientLabel(label)}
              </Text>
              {change && (
                <Text style={[
                  styles.changeIndicator,
                  { color: change.startsWith('↑') ? '#4C763B' : '#FF6363' }
                ]}>
                  {change}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      
      {/* Health zones legend */}
      <View style={styles.zonesLegend}>
        <View style={styles.zoneItem}>
          <View style={[styles.zoneIndicator, { backgroundColor: '#4C763B', marginRight: 4 }]} />
          <Text style={styles.zoneText}>
            {isHindi ? 'स्वस्थ ≥70%' : 'Healthy ≥70%'}
          </Text>
        </View>
        <View style={styles.zoneItem}>
          <View style={[styles.zoneIndicator, { backgroundColor: '#FA8112', marginRight: 4 }]} />
          <Text style={styles.zoneText}>
            {isHindi ? 'ध्यान 50-70%' : 'Attention 50-70%'}
          </Text>
        </View>
        <View style={styles.zoneItem}>
          <View style={[styles.zoneIndicator, { backgroundColor: '#FF6363', marginRight: 4 }]} />
          <Text style={styles.zoneText}>
            {isHindi ? 'गंभीर <50%' : 'Critical <50%'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chartContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noDataContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 13,
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
  nutrientLabelContainer: {
    alignItems: 'center',
    flex: 1,
  },
  nutrientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  changeIndicator: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  zonesLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  zoneIndicator: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  zoneText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default ComparisonChart;
