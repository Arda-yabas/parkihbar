import React, {useState, useEffect, useRef, useMemo} from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput, KeyboardAvoidingView, Platform, Linking, Animated} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {FirestoreService, Comment, AuthService, firestore} from '../../../services/firebase';
import {GamificationService} from '../../../services/gamification.service';
import {BadgePopup} from '../../gamification/components/BadgePopup';
import {getTemplate} from '../../../constants/reportTemplates';
import {BackButton} from '../../../components/BackButton';

const {width} = Dimensions.get('window');

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':  return '#FFA500';
    case 'verified': return '#4CAF50';
    case 'resolved': return '#2196F3';
    default:         return '#999';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':  return '⏳ Bekliyor';
    case 'verified': return '✓ Onaylı';
    case 'resolved': return '✓ Çözüldü';
    default:         return 'Bilinmiyor';
  }
};

export const ReportDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const params = route.params as any;
  const [report, setReport] = useState<any>(params?.report ?? null);
  const [loadingReport, setLoadingReport] = useState(!params?.report && !!params?.reportId);

  const template = getTemplate(report?.type ?? 'diger');
  const shareInfo = report
    ? {photoUrl: report.photoUrl, type: report.type, location: report.location, note: report.note}
    : null;

  const [hasSeenIt, setHasSeenIt] = useState(false);
  const [seenCount, setSeenCount] = useState<number>(report?.seenCount ?? 0);
  const [status, setStatus] = useState<string>(report?.status ?? 'pending');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [badgePopupData, setBadgePopupData] = useState<any>(null);
  const [showBadgePopup, setShowBadgePopup] = useState(false);

  useEffect(() => {
    if (!params?.report && params?.reportId) {
      FirestoreService.getReport(params.reportId)
        .then(r => {
          if (r) {
            setReport(r);
            setSeenCount(r.seenCount ?? 0);
            setStatus(r.status ?? 'pending');
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReport(false));
    }
  }, []);

  useEffect(() => {
    if (!report?.id) return;
    AsyncStorage.getItem(`@seen_report_${report.id}`)
      .then(val => { if (val) setHasSeenIt(true); })
      .catch(() => {});
    if (report.createdAt && report.status !== 'verified' && report.status !== 'resolved') {
      FirestoreService.checkAndAutoVerify(report.id, report.createdAt)
        .then(newStatus => { if (newStatus === 'verified') setStatus('verified'); })
        .catch(() => {});
    }
    // Yorumları real-time dinle
    const unsub = firestore()
      .collection('reports')
      .doc(report.id)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => setComments(snap.docs.map(doc => ({id: doc.id, ...doc.data()} as Comment))),
        () => {},
      );
    return () => unsub();
  }, [report?.id]);

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || !report?.id || sending) return;
    setSending(true);
    setCommentText('');
    try {
      const newComment = await FirestoreService.addComment(report.id, text, 'Sen');
      setComments(prev => [...prev, newComment]);
      setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 100);
      showToast('+2 puan · Yorumun topluma katkı sağladı 💬');
      const currentUid = AuthService.getCurrentUser()?.uid;
      if (currentUid) {
        await FirestoreService.incrementUserCommentsCount(currentUid);
        GamificationService.addPoints(currentUid, 2).catch(() => {});
        GamificationService.checkNewBadges(currentUid).then(badges => {
          if (badges.length > 0) {
            setBadgePopupData(badges[0]);
            setTimeout(() => setShowBadgePopup(true), 2200);
          }
        }).catch(() => {});
      }
    } catch {
      setCommentText(text);
    } finally {
      setSending(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, {toValue: 1, duration: 250, useNativeDriver: true}),
      Animated.delay(1800),
      Animated.timing(toastAnim, {toValue: 0, duration: 300, useNativeDriver: true}),
    ]).start(() => setToastMessage(''));
  };

  const handleSeenIt = async () => {
    if (hasSeenIt || !report?.id) return;
    setHasSeenIt(true);
    AsyncStorage.setItem(`@seen_report_${report.id}`, 'true').catch(() => {});
    setSeenCount(c => c + 1);
    showToast('+5 puan · Şehrine katkı sağladın 🌍');
    try {
      const {newCount, newStatus} = await FirestoreService.incrementSeenCount(report.id);
      setSeenCount(newCount);
      setStatus(newStatus);
      const currentUid = AuthService.getCurrentUser()?.uid;
      const reportOwnerUid = report.userId;
      if (reportOwnerUid && reportOwnerUid !== currentUid) {
        const viewerName = (await AsyncStorage.getItem('@username').catch(() => null)) || 'Biri';
        FirestoreService.notifySeenIt(report.id, reportOwnerUid, viewerName).catch(() => {});
      }
      if (currentUid) {
        await FirestoreService.incrementUserSeenItCount(currentUid);
        GamificationService.addPoints(currentUid, 5).catch(() => {});
        GamificationService.checkNewBadges(currentUid).then(badges => {
          if (badges.length > 0) {
            setBadgePopupData(badges[0]);
            setTimeout(() => setShowBadgePopup(true), 2200);
          }
        }).catch(() => {});
      }
    } catch {}
  };

  if (loadingReport) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text style={{color: colors.text, fontSize: 16}}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text style={{color: colors.text, fontSize: 16}}>İhbar bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <BackButton />
        <Text style={styles.headerTitle}>İhbar Detayı</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={styles.scrollView}>
          <Image source={{uri: report.photoUrl}} style={styles.photo} resizeMode="cover" />

          <View style={styles.content}>
            {/* Type + location row */}
            <View style={styles.typeContainer}>
              <Text style={styles.typeIcon}>{template.emoji}</Text>
              <View style={{flex: 1}}>
                <Text style={styles.typeName}>{template.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const lat = report.location?.latitude;
                    const lon = report.location?.longitude;
                    if (!lat || !lon) return;
                    Linking.openURL(`maps://?q=${lat},${lon}`).catch(() =>
                      Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`),
                    );
                  }}
                  activeOpacity={report.location?.latitude ? 0.6 : 1}>
                  <Text style={styles.locationInline}>
                    📍 {[report.location?.district, report.location?.address].filter(Boolean).join(', ') || report.location?.address}
                    {report.location?.latitude ? '  ›' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.statusBadge, {backgroundColor: getStatusColor(status) + '20', alignSelf: 'flex-start'}]}>
                <Text style={[styles.statusText, {color: getStatusColor(status)}]}>
                  {getStatusText(status)}
                </Text>
              </View>
            </View>

            {/* Ben de Gördüm — prominent card */}
            <View style={styles.seenCard}>
              <View style={styles.seenCountRow}>
                <Text style={styles.seenCountNum}>{seenCount}</Text>
                <Text style={styles.seenCountLabel}> kişi bu ihbarı gördüğünü bildirdi</Text>
              </View>
              <Text style={styles.seenDesc}>
                {hasSeenIt
                  ? 'Teşekkürler! Onayın ihbarın güvenilirliğini artırdı.'
                  : status === 'pending'
                  ? 'Sen de gerçekten gördüysen onayla — 3 onay alan ihbarlar otomatik doğrulanır ve yetkililere iletilmesi kolaylaşır.'
                  : 'Bu ihbar topluluk tarafından doğrulandı.'}
              </Text>
              <TouchableOpacity
                style={[styles.seenButton, hasSeenIt && styles.seenButtonDone]}
                onPress={handleSeenIt}
                disabled={hasSeenIt}
                activeOpacity={0.8}>
                <Text style={[styles.seenButtonText, hasSeenIt && {color: colors.primary}]}>
                  {hasSeenIt ? '✓ Onayladın' : '👍 Ben de Gördüm'}
                </Text>
              </TouchableOpacity>
            </View>

            {report.note && (
              <View style={styles.section}>
                <Text style={styles.sectionIcon}>📝</Text>
                <View style={styles.sectionContent}>
                  <Text style={styles.descriptionText}>"{report.note}"</Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionIcon}>👤</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.infoValue}>{report.userName || 'Anonim'} tarafından bildirildi</Text>
              </View>
            </View>

            <View style={styles.commentsSection}>
              <Text style={styles.commentsSectionTitle}>
                💬 Yorumlar {comments.length > 0 && `(${comments.length})`}
              </Text>

              {comments.length === 0 && (
                <Text style={styles.noComments}>Henüz yorum yok. İlk yorumu sen yaz!</Text>
              )}

              {comments.map((c, i) => (
                <View key={c.id ?? i} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAvatar}>👤</Text>
                    <Text style={styles.commentUser}>{c.userName}</Text>
                    <Text style={styles.commentTime}>
                      {c.createdAt?.toDate
                        ? new Date(c.createdAt.toDate()).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})
                        : 'Az önce'}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))}
            </View>

            <View style={{height: 80}} />
          </View>
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Yorum yaz..."
            placeholderTextColor={colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!commentText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || sending}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {!!toastMessage && (
        <Animated.View style={[styles.toast, {opacity: toastAnim}]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
      {badgePopupData && (
        <BadgePopup visible={showBadgePopup} badge={badgePopupData} onClose={() => setShowBadgePopup(false)} />
      )}
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 16, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center'},
  backIcon: {fontSize: 24, color: colors.text},
  headerTitle: {fontSize: 18, fontWeight: 'bold', color: colors.text},
  headerRight: {width: 40},
  scrollView: {flex: 1},
  photo: {width, height: width * 0.48, backgroundColor: colors.card},
  content: {padding: 16},
  typeContainer: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12},
  typeIcon: {fontSize: 36, marginTop: 2},
  typeName: {fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4},
  locationInline: {fontSize: 13, color: colors.primary, fontWeight: '500'},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10},
  statusText: {fontSize: 12, fontWeight: '600'},
  // Ben de Gördüm card
  seenCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  seenCountRow: {flexDirection: 'row', alignItems: 'baseline', marginBottom: 8},
  seenCountNum: {fontSize: 28, fontWeight: '800', color: colors.primary},
  seenCountLabel: {fontSize: 14, color: colors.text, fontWeight: '500'},
  seenDesc: {fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 14},
  seenButton: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  seenButtonDone: {backgroundColor: colors.primaryLight},
  seenButtonText: {fontSize: 15, fontWeight: '700', color: '#FFF'},
  //
  section: {flexDirection: 'row', marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  sectionIcon: {fontSize: 20, marginRight: 10, marginTop: 1},
  sectionContent: {flex: 1},
  descriptionText: {fontSize: 14, color: colors.text, lineHeight: 20, fontStyle: 'italic'},
  infoValue: {fontSize: 14, color: colors.textSecondary},
  flex: {flex: 1},
  commentsSection: {marginTop: 8},
  commentsSectionTitle: {fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12},
  noComments: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24, fontStyle: 'italic'},
  commentCard: {backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10},
  commentHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  commentAvatar: {fontSize: 18, marginRight: 6},
  commentUser: {fontSize: 14, fontWeight: '600', color: colors.text, flex: 1},
  commentTime: {fontSize: 12, color: colors.textSecondary},
  commentText: {fontSize: 14, color: colors.text, lineHeight: 20},
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: colors.text, marginRight: 10,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: {backgroundColor: colors.border},
  sendIcon: {fontSize: 18, color: '#FFFFFF'},
  toast: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 22,
    paddingHorizontal: 20, paddingVertical: 11, zIndex: 100,
  },
  toastText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  actions: {marginTop: 8},
  actionButton: {backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12},
  actionButtonActive: {backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary},
  actionButtonText: {fontSize: 16, fontWeight: '600', color: colors.background},
  whatsappButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#25D366', borderRadius: 12, padding: 16,
    shadowColor: '#25D366', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  whatsappIcon: {fontSize: 26, marginRight: 12},
  whatsappTitle: {fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2},
  whatsappSub: {fontSize: 12, color: 'rgba(255,255,255,0.85)'},
  whatsappArrow: {fontSize: 26, color: 'rgba(255,255,255,0.75)'},
});
