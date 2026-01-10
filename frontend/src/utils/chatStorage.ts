/**
 * Chat Storage Utility
 * ====================
 * Handles persistence of chat conversations using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../api';

const CHAT_HISTORY_KEY = '@fasalvaidya_chat_history';
const CHAT_SESSIONS_KEY = '@fasalvaidya_chat_sessions';

export interface ChatSession {
  id: string;
  title: string;
  cropName?: string;
  cropIcon?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a unique session ID
 */
export const generateSessionId = (): string => {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get all chat sessions (metadata only, without messages)
 */
export const getChatSessions = async (): Promise<Omit<ChatSession, 'messages'>[]> => {
  try {
    const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    if (!sessionsJson) return [];
    
    const sessions: ChatSession[] = JSON.parse(sessionsJson);
    // Return sessions without messages for list display
    return sessions.map(({ messages, ...session }) => session);
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return [];
  }
};

/**
 * Get a specific chat session with all messages
 */
export const getChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    if (!sessionsJson) return null;
    
    const sessions: ChatSession[] = JSON.parse(sessionsJson);
    return sessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error('Error getting chat session:', error);
    return null;
  }
};

/**
 * Save or update a chat session
 */
export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
  try {
    const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    let sessions: ChatSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];
    
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session); // Add new session at the beginning
    }
    
    // Limit to 50 sessions
    if (sessions.length > 50) {
      sessions = sessions.slice(0, 50);
    }
    
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch (error) {
    console.error('Error saving chat session:', error);
    return false;
  }
};

/**
 * Delete a chat session
 */
export const deleteChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    if (!sessionsJson) return true;
    
    let sessions: ChatSession[] = JSON.parse(sessionsJson);
    sessions = sessions.filter(s => s.id !== sessionId);
    
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return false;
  }
};

/**
 * Clear all chat history
 */
export const clearAllChatHistory = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(CHAT_SESSIONS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
};

/**
 * Get the most recent session (for resuming)
 */
export const getMostRecentSession = async (): Promise<ChatSession | null> => {
  try {
    const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    if (!sessionsJson) return null;
    
    const sessions: ChatSession[] = JSON.parse(sessionsJson);
    return sessions.length > 0 ? sessions[0] : null;
  } catch (error) {
    console.error('Error getting most recent session:', error);
    return null;
  }
};

export default {
  generateSessionId,
  getChatSessions,
  getChatSession,
  saveChatSession,
  deleteChatSession,
  clearAllChatHistory,
  getMostRecentSession,
};
