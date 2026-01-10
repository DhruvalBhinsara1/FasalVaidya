/**
 * ChatHistoryScreen - Chat History List
 * ======================================
 * Displays list of previous chat sessions that can be resumed or deleted.
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { getCurrentLanguage } from '../i18n';
import { borderRadius, colors, shadows, spacing } from '../theme';
import {
    ChatSession,
    clearAllChatHistory,
    deleteChatSession,
    getChatSessions,
} from '../utils/chatStorage';

type SessionListItem = Omit<ChatSession, 'messages'>;

const ChatHistoryScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const isHindi = getCurrentLanguage() === 'hi';

    const [sessions, setSessions] = useState<SessionListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadSessions = useCallback(async () => {
        try {
            const loadedSessions = await getChatSessions();
            setSessions(loadedSessions);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadSessions();
    }, [loadSessions]);

    const handleOpenSession = (sessionId: string) => {
        navigation.navigate('Chat', { sessionId });
    };

    const handleDeleteSession = (sessionId: string) => {
        Alert.alert(
            isHindi ? 'हटाएं?' : 'Delete?',
            isHindi ? 'क्या आप इस चैट को हटाना चाहते हैं?' : 'Are you sure you want to delete this chat?',
            [
                { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
                {
                    text: isHindi ? 'हटाएं' : 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteChatSession(sessionId);
                        loadSessions();
                    },
                },
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            isHindi ? 'सभी हटाएं?' : 'Clear All?',
            isHindi ? 'क्या आप सभी चैट इतिहास हटाना चाहते हैं?' : 'Are you sure you want to delete all chat history?',
            [
                { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
                {
                    text: isHindi ? 'सभी हटाएं' : 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllChatHistory();
                        setSessions([]);
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return isHindi ? 'आज' : 'Today';
        } else if (diffDays === 1) {
            return isHindi ? 'कल' : 'Yesterday';
        } else if (diffDays < 7) {
            return isHindi ? `${diffDays} दिन पहले` : `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const renderSession = ({ item }: { item: SessionListItem }) => (
        <TouchableOpacity
            style={styles.sessionCard}
            onPress={() => handleOpenSession(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.sessionIcon}>
                <Text style={styles.sessionIconText}>{item.cropIcon || '🌾'}</Text>
            </View>
            <View style={styles.sessionContent}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.sessionMeta}>
                    {item.cropName && `${item.cropName} • `}
                    {formatDate(item.updatedAt)}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSession(item.id)}
            >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
                {isHindi ? 'कोई चैट इतिहास नहीं' : 'No Chat History'}
            </Text>
            <Text style={styles.emptyText}>
                {isHindi
                    ? 'AI विश्लेषण शुरू करें और आपकी चैट यहां सहेजी जाएंगी'
                    : 'Start an AI analysis and your chats will be saved here'}
            </Text>
            <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate('Chat')}
            >
                <Text style={styles.startButtonText}>
                    {isHindi ? 'नई चैट शुरू करें' : 'Start New Chat'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isHindi ? 'चैट इतिहास' : 'Chat History'}
                </Text>
                {sessions.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                )}
                {sessions.length === 0 && <View style={{ width: 40 }} />}
            </View>

            {/* Session List */}
            <FlatList
                data={sessions}
                renderItem={renderSession}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    sessions.length === 0 && styles.listContentEmpty,
                ]}
                ListEmptyComponent={!isLoading ? renderEmptyState : null}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            />
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    clearButton: {
        padding: spacing.xs,
    },
    listContent: {
        padding: spacing.md,
    },
    listContentEmpty: {
        flex: 1,
    },
    sessionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    sessionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    sessionIconText: {
        fontSize: 20,
    },
    sessionContent: {
        flex: 1,
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    sessionMeta: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    deleteButton: {
        padding: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    startButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.lg,
    },
    startButtonText: {
        color: colors.textWhite,
        fontWeight: '600',
        fontSize: 14,
    },
});

export default ChatHistoryScreen;
