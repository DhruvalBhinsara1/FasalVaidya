/**
 * Device Auth Test Screen
 * ========================
 * UI screen to run device-bound authentication tests
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { borderRadius, colors, shadows, spacing } from '../theme';
import { tests } from '../utils/testDeviceAuth';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

const DeviceAuthTestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userId, profile, syncToServer } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  // Run individual test
  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    setIsRunning(true);
    try {
      const result = await testFn();
      setResults(prev => [...prev, result]);
    } catch (error: any) {
      setResults(prev => [
        ...prev,
        {
          name: testName,
          passed: false,
          message: error.message || 'Test failed',
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      const testResults: TestResult[] = [];
      
      // Run each test sequentially
      testResults.push(await tests.deviceIdGeneration());
      testResults.push(await tests.deviceIdPersistence());
      testResults.push(await tests.supabaseConnection());
      testResults.push(await tests.userCreation());
      testResults.push(await tests.userRetrieval());
      testResults.push(await tests.phoneAntiHijack());
      testResults.push(await tests.profileUpdate());
      
      setResults(testResults);
      
      const passed = testResults.filter(r => r.passed).length;
      const total = testResults.length;
      
      Alert.alert(
        'Test Results',
        `${passed}/${total} tests passed\n\n` +
        (passed === total ? '✅ All tests passed!' : `❌ ${total - passed} tests failed`)
      );
    } catch (error: any) {
      Alert.alert('Error', `Test suite failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setResults([]);
    setExpandedTest(null);
  };

  // Toggle expanded test details
  const toggleExpanded = (testName: string) => {
    setExpandedTest(expandedTest === testName ? null : testName);
  };

  // Get summary stats
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Auth Tests</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Current State Card */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Current State</Text>
          
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>Device ID:</Text>
            <Text style={styles.stateValue} numberOfLines={1}>
              {userId ? `${userId.slice(0, 8)}...${userId.slice(-4)}` : 'None'}
            </Text>
          </View>
          
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>Name:</Text>
            <Text style={styles.stateValue}>{profile?.name || 'Not set'}</Text>
          </View>
          
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>Phone:</Text>
            <Text style={styles.stateValue}>{profile?.phone || 'Not set'}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => syncToServer()}
          >
            <Ionicons name="cloud-upload" size={20} color={colors.primary} />
            <Text style={styles.syncButtonText}>Sync to Server</Text>
          </TouchableOpacity>
        </Card>

        {/* Test Controls */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color="#FFF" />
                <Text style={styles.buttonText}>Run All Tests</Text>
              </>
            )}
          </TouchableOpacity>

          {results.length > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={clearResults}
            >
              <Ionicons name="trash" size={20} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.primary }]}>Clear Results</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Test Results Summary */}
        {results.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{total}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {passed}
                </Text>
                <Text style={styles.summaryLabel}>Passed</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {failed}
                </Text>
                <Text style={styles.summaryLabel}>Failed</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {total > 0 ? Math.round((passed / total) * 100) : 0}%
                </Text>
                <Text style={styles.summaryLabel}>Success</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Individual Test Results */}
        {results.map((result, index) => (
          <Card key={index} style={styles.testCard}>
            <TouchableOpacity
              style={styles.testHeader}
              onPress={() => toggleExpanded(result.name)}
            >
              <View style={styles.testTitleRow}>
                <Ionicons
                  name={result.passed ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={result.passed ? colors.success : colors.error}
                />
                <Text style={styles.testName}>{result.name}</Text>
              </View>
              <Ionicons
                name={expandedTest === result.name ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <Text style={styles.testMessage}>{result.message}</Text>

            {expandedTest === result.name && result.data && (
              <View style={styles.testData}>
                <Text style={styles.testDataLabel}>Details:</Text>
                <Text style={styles.testDataValue}>
                  {JSON.stringify(result.data, null, 2)}
                </Text>
              </View>
            )}
          </Card>
        ))}

        {/* Individual Test Buttons */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Individual Tests</Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('Device ID Generation', tests.deviceIdGeneration)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>1. Device ID Generation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('Device ID Persistence', tests.deviceIdPersistence)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>2. Device ID Persistence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('Supabase Connection', tests.supabaseConnection)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>3. Supabase Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('User Creation', tests.userCreation)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>4. User Creation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('User Retrieval', tests.userRetrieval)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>5. User Retrieval</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('Phone Anti-Hijack', tests.phoneAntiHijack)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>6. Phone Anti-Hijack</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => runTest('Profile Update', tests.profileUpdate)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>7. Profile Update</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#FFF',
    ...shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  stateValue: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: `${colors.primary}10`,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  testCard: {
    marginBottom: spacing.sm,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  testTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  testMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  testData: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  testDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  testDataValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
  testButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default DeviceAuthTestScreen;
