/**
 * ChatScreen - AI Analysis Chat
 * ==============================
 * AI-powered chat interface for crop nutrient analysis using Ollama.
 * Provides contextual advice based on scan history.
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

import {
  ChatMessage,
  checkChatStatus,
  getScan,
  getScans,
  ScanHistoryItem,
  ScanResult,
  sendChatMessage
} from '../api';
import { Card, StatusChip } from '../components';
import { getCurrentLanguage } from '../i18n';
import { borderRadius, colors, shadows, spacing } from '../theme';
import {
  ChatSession,
  generateSessionId,
  getChatSession,
  saveChatSession
} from '../utils/chatStorage';
import { getCropIcon } from '../utils/cropIcons';

interface RouteParams {
  scanId?: number;
  cropId?: number;
  sessionId?: string;
}

// Base dimensions for scaling (based on standard phone width)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Responsive scaling functions
const scale = (size: number, width: number) => (width / BASE_WIDTH) * size;
const verticalScale = (size: number, height: number) => (height / BASE_HEIGHT) * size;
const moderateScale = (size: number, width: number, factor = 0.5) => 
  size + (scale(size, width) - size) * factor;

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params: RouteParams = route.params || {};
  const isHindi = getCurrentLanguage() === 'hi';
  
  // Responsive dimensions
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLandscape = width > height;
  
  // Responsive sizing utilities
  const rs = (size: number) => moderateScale(size, width, 0.4);
  const rsFont = (size: number) => moderateScale(size, width, 0.3);
  
  // Dynamic responsive values
  const responsiveValues = {
    headerIconSize: rs(24),
    welcomeIconSize: rs(48),
    welcomeIconContainer: rs(80),
    assistantIconSize: rs(16),
    assistantIconContainer: rs(24),
    sendButtonSize: rs(44),
    imageButtonSize: rs(44),
    inputMinHeight: rs(44),
    inputMaxHeight: rs(120),
    previewImageSize: rs(100),
    offlineIconSize: rs(64),
    contextIconSize: rs(32),
    messageBubbleMaxWidth: (isTablet ? (isLandscape ? '50%' : '70%') : '85%') as `${number}%`,
    containerPadding: isTablet ? spacing.lg : spacing.md,
  };
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [context, setContext] = useState<Partial<ScanResult> | null>(null);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Stop speaking when unmounting or leaving screen
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleSpeak = async (text: string, index: number) => {
    try {
      if (isSpeaking && speakingMessageId === index) {
        await Speech.stop();
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      } else {
        if (isSpeaking) {
          await Speech.stop();
        }
        setSpeakingMessageId(index);
        setIsSpeaking(true);
        Speech.speak(text, {
          language: isHindi ? 'hi-IN' : 'en-US',
          onDone: () => {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
          },
          onStopped: () => {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
          },
          onError: () => {
             setIsSpeaking(false);
             setSpeakingMessageId(null);
          }
        });
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  // useSpeechRecognitionEvent removed here as it is handled in the hook safely
  // handleVoiceInput removed as it is replaced by toggleRecording

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      if (params.sessionId) {
        // Load existing session
        const session = await getChatSession(params.sessionId);
        if (session) {
          setMessages(session.messages);
          setCurrentSessionId(session.id);
          return;
        }
      }
      // Create new session
      setCurrentSessionId(generateSessionId());
    };
    initSession();
  }, [params.sessionId]);

  // Check AI availability and load context on mount
  useEffect(() => {
    checkAvailability();
    loadContext();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Save session when messages change
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      const session: ChatSession = {
        id: currentSessionId,
        title: messages[0]?.content?.substring(0, 50) || 'Chat',
        cropName: context?.crop_name,
        cropIcon: context?.crop_icon,
        messages: messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveChatSession(session);
    }
  }, [messages, currentSessionId]);

  const checkAvailability = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await checkChatStatus();
      setIsAvailable(status.available);
      if (!status.available) {
        setErrorMessage(status.message || status.error || 'AI service unavailable');
      }
    } catch (error) {
      setIsAvailable(false);
      setErrorMessage('Failed to connect to AI service');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const loadContext = async () => {
    try {
      // If specific scan provided, load its details
      if (params.scanId) {
        const scan = await getScan(params.scanId);
        setContext(scan);
      }
      
      // Load recent scans for context
      const scans = await getScans(params.cropId, 5);
      setRecentScans(scans);
      
      // If no specific scan, use most recent
      if (!params.scanId && scans.length > 0) {
        const latestScan = await getScan(scans[0].scan_id);
        setContext(latestScan);
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos!'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images!'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await sendChatMessage(
        text, 
        messages, 
        context, 
        imageToSend || undefined, 
        isHindi ? 'hi' : 'en'
      );
      
      if (response.success && response.response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        if (response.needs_connection) {
          setErrorMessage(response.message || 'Need an active internet connection');
          setIsAvailable(false);
        } else {
          // Add error as system message
          const errorMsg: ChatMessage = {
            role: 'assistant',
            content: `⚠️ ${response.error || 'Failed to get response'}`,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      }
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `⚠️ Error: ${error.message || 'Something went wrong'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    checkAvailability();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'healthy': return colors.healthy;
      case 'attention': return colors.attention;
      case 'critical': return colors.critical;
      default: return colors.textSecondary;
    }
  };

  const renderContextCard = () => {
    if (!context) return null;

    return (
      <Card style={styles.contextCard}>
          <View style={styles.contextHeader}>
            {(() => {
              const src = getCropIcon(context?.crop_name || context?.crop_icon);
              return src ? (
                <Image source={src} style={[styles.contextIconImage, { width: responsiveValues.contextIconSize, height: responsiveValues.contextIconSize, borderRadius: responsiveValues.contextIconSize / 2 }]} resizeMode="cover" />
              ) : (
                <Text style={[styles.contextIcon, { fontSize: responsiveValues.contextIconSize }]}>{context?.crop_icon}</Text>
              );
            })()}
          <View style={styles.contextInfo}>
            <Text style={[styles.contextTitle, { fontSize: rsFont(16) }]}>
              {isHindi ? context.crop_name_hi : context.crop_name}
            </Text>
            <StatusChip status={context.overall_status as any} size="small" />
          </View>
        </View>
        <View style={styles.nutrientRow}>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientLabel, { fontSize: rsFont(12) }]}>N</Text>
            <Text style={[styles.nutrientValue, { fontSize: rsFont(18), color: getSeverityColor(context.n_severity || '') }]}>
              {context.n_score}%
            </Text>
          </View>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientLabel, { fontSize: rsFont(12) }]}>P</Text>
            <Text style={[styles.nutrientValue, { fontSize: rsFont(18), color: getSeverityColor(context.p_severity || '') }]}>
              {context.p_score}%
            </Text>
          </View>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientLabel, { fontSize: rsFont(12) }]}>K</Text>
            <Text style={[styles.nutrientValue, { fontSize: rsFont(18), color: getSeverityColor(context.k_severity || '') }]}>
              {context.k_score}%
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderOfflineMessage = () => (
    <View style={[styles.offlineContainer, { paddingHorizontal: responsiveValues.containerPadding }]}>
      <Ionicons name="cloud-offline" size={responsiveValues.offlineIconSize} color={colors.textSecondary} />
      <Text style={[styles.offlineTitle, { fontSize: rsFont(20) }]}>
        {isHindi ? 'AI सेवा उपलब्ध नहीं' : 'AI Service Unavailable'}
      </Text>
      <Text style={[styles.offlineText, { fontSize: rsFont(14) }]}>
        {isHindi 
          ? 'AI विश्लेषण का उपयोग करने के लिए एक सक्रिय इंटरनेट कनेक्शन की आवश्यकता है। कृपया सुनिश्चित करें कि Ollama आपके कंप्यूटर पर चल रहा है।'
          : 'Need an active internet connection to use AI analysis. Please ensure Ollama is running on your computer.'}
      </Text>
      <TouchableOpacity style={[styles.retryButton, { paddingHorizontal: rs(24), paddingVertical: rs(12) }]} onPress={handleRetry}>
        <Ionicons name="refresh" size={rs(20)} color={colors.textWhite} />
        <Text style={[styles.retryButtonText, { fontSize: rsFont(14) }]}>
          {isHindi ? 'पुनः प्रयास करें' : 'Retry'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.role === 'user';
    
    return (
      <View
        key={index}
        style={[
          styles.messageBubble,
          { maxWidth: responsiveValues.messageBubbleMaxWidth },
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantIconWrapper}>
            <View style={styles.assistantIcon}>
              <Ionicons name="leaf" size={16} color={colors.primary} />
            </View>
          </View>
        )}
        <View style={styles.messageContent}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {msg.content}
          </Text>
          {!isUser && (
             <TouchableOpacity 
               onPress={() => handleSpeak(msg.content, index)}
               style={{ marginTop: 8, alignSelf: 'flex-start', padding: 4 }}
             >
               <Ionicons 
                 name={isSpeaking && speakingMessageId === index ? "volume-high" : "volume-medium-outline"} 
                 size={20} 
                 color={isSpeaking && speakingMessageId === index ? colors.primary : colors.textSecondary} 
               />
             </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderWelcomeMessage = () => (
    <View style={[styles.welcomeContainer, { paddingVertical: rs(32) }]}>
      <View style={[
        styles.welcomeIcon, 
        { width: responsiveValues.welcomeIconContainer, height: responsiveValues.welcomeIconContainer, borderRadius: responsiveValues.welcomeIconContainer / 2 }
      ]}>
        <Ionicons name="chatbubbles" size={responsiveValues.welcomeIconSize} color={colors.primary} />
      </View>
      <Text style={[styles.welcomeTitle, { fontSize: rsFont(24) }]}>
        {isHindi ? 'FasalMitra' : 'FasalMitra'}
      </Text>
      <Text style={[styles.welcomeText, { fontSize: rsFont(14), paddingHorizontal: rs(24) }]}>
        {isHindi
          ? 'मैं आपकी फसल के पोषक तत्वों की कमी को समझने और समाधान सुझाने में मदद कर सकता हूं। कोई भी सवाल पूछें!'
          : 'I can help you understand your crop\'s nutrient deficiencies and suggest solutions. Ask me anything!'}
      </Text>
      <View style={styles.suggestionContainer}>
        <Text style={[styles.suggestionLabel, { fontSize: rsFont(12), paddingHorizontal: rs(16) }]}>
          {isHindi ? 'सुझाए गए प्रश्न:' : 'Suggested questions:'}
        </Text>
        {[
          isHindi ? 'मेरी फसल में क्या कमी है?' : 'What deficiency does my crop have?',
          isHindi ? 'इसे ठीक करने के लिए क्या करूं?' : 'How do I fix this?',
          isHindi ? 'कौन सी खाद का उपयोग करूं?' : 'Which fertilizer should I use?',
        ].map((suggestion, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.suggestionChip, { paddingHorizontal: rs(16), paddingVertical: rs(12), marginHorizontal: rs(16) }]}
            onPress={() => setInputText(suggestion)}
          >
            <Text style={[styles.suggestionText, { fontSize: rsFont(14) }]}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: responsiveValues.containerPadding }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={responsiveValues.headerIconSize} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { fontSize: rsFont(18) }]}>
            {isHindi ? 'FasalMitra' : 'FasalMitra'}
          </Text>
          {isAvailable && (
            <View style={styles.onlineIndicator}>
              <View style={[styles.onlineDot, { width: rs(8), height: rs(8), borderRadius: rs(4) }]} />
              <Text style={[styles.onlineText, { fontSize: rsFont(12) }]}>Online</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ChatHistory' as never)} 
            style={styles.headerButton}
          >
            <Ionicons name="time-outline" size={rs(22)} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setMessages([]);
              setCurrentSessionId(generateSessionId());
            }} 
            style={styles.headerButton}
          >
            <Ionicons name="add-circle-outline" size={rs(22)} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading state */}
      {isCheckingStatus ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: rsFont(16) }]}>
            {isHindi ? 'AI सेवा जांच रहे हैं...' : 'Checking AI service...'}
          </Text>
        </View>
      ) : !isAvailable ? (
        renderOfflineMessage()
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Context Card */}
          {renderContextCard()}

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              renderWelcomeMessage()
            ) : (
              messages.map(renderMessage)
            )}
            
            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble, { maxWidth: responsiveValues.messageBubbleMaxWidth }]}>
                <View style={styles.assistantIconWrapper}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
                <View style={styles.messageContent}>
                  <Text style={styles.typingText}>
                    {isHindi ? 'सोच रहा हूं...' : 'Thinking...'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={[styles.inputContainer, { padding: responsiveValues.containerPadding }]}>
            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                  style={[styles.previewImage, { width: responsiveValues.previewImageSize, height: responsiveValues.previewImageSize }]}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={rs(24)} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.imageButton, { width: responsiveValues.imageButtonSize, height: responsiveValues.imageButtonSize }]}
                onPress={takePhoto}
                disabled={isLoading}
              >
                <Ionicons
                  name="camera"
                  size={rs(24)}
                  color={isLoading ? colors.textSecondary : colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageButton, { width: responsiveValues.imageButtonSize, height: responsiveValues.imageButtonSize }]}
                onPress={pickImage}
                disabled={isLoading}
              >
                <Ionicons
                  name="image"
                  size={rs(24)}
                  color={isLoading ? colors.textSecondary : colors.primary}
                />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { minHeight: responsiveValues.inputMinHeight, maxHeight: responsiveValues.inputMaxHeight, fontSize: rsFont(16) }]}
                placeholder={isHindi ? 'अपना सवाल पूछें...' : 'Ask your question...'}
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { width: responsiveValues.sendButtonSize, height: responsiveValues.sendButtonSize, borderRadius: responsiveValues.sendButtonSize / 2 },
                  (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="send"
                  size={rs(20)}
                  color={inputText.trim() && !isLoading ? colors.textWhite : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E7EB',
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.healthy,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: colors.healthy,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  offlineText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  chatContainer: {
    flex: 1,
  },
  contextCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contextIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  contextIconImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  contextInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E7EB',
  },
  nutrientItem: {
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  nutrientValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  suggestionContainer: {
    marginTop: spacing.lg,
    width: '100%',
  },
  suggestionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionChip: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  suggestionText: {
    fontSize: 14,
    color: colors.primary,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderBottomLeftRadius: borderRadius.sm,
    ...shadows.sm,
  },
  assistantIconWrapper: {
    paddingRight: spacing.sm,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContent: {
    flex: 1,
    flexShrink: 1,
  },
  messageText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  userMessageText: {
    color: colors.textWhite,
  },
  typingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputContainer: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  imageButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary + '30',
  },
});

export default ChatScreen;
