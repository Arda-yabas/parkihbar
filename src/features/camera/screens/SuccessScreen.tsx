import React, {useState, useEffect, useRef, useMemo} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, Animated, ScrollView} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {AuthService} from '../../../services/firebase';
import {GamificationService} from '../../../services/gamification.service';
import {LevelUpPopup} from '../../gamification/components/LevelUpPopup';
import {BadgePopup} from '../../gamification/components/BadgePopup';
import {CameraStackParamList} from '../../../navigation/AppNavigator';
import {ShareSheet} from '../../../components/ShareSheet';
import {FlowStepper} from '../../../components/FlowStepper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type SuccessRouteProp = RouteProp<CameraStackParamList, 'Success'>;

export const SuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<SuccessRouteProp>();
  const {photoUrl, localPhotoUri, type, location, note, points = 15} = route.params;
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [badgeData, setBadgeData] = useState<any>(null);

  const pointsAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const shareInfo = {photoUrl, localPhotoUri, type, location, note};

  useEffect(() => {
    checkGamification();
    Animated.parallel([
      Animated.spring(scaleAnim, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
      Animated.timing(pointsAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
    ]).start();
  }, []);

  const checkGamification = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {return;}
      const result = await GamificationService.addPoints(user.uid, points);

      if (result?.leveledUp) {
        const oldLevelInfo = GamificationService.getLevelInfo(result.oldLevel);
        const newLevelInfo = GamificationService.getLevelInfo(result.newLevel);
        setLevelUpData({oldLevel: result.oldLevel, newLevel: result.newLevel, oldLevelInfo, newLevelInfo});
        setTimeout(() => setShowLevelUp(true), 1000);
      }

      const newBadges = await GamificationService.checkNewBadges(user.uid, {
        totalReports: result?.totalReports || 0,
        verifiedReports: result?.verifiedReports || 0,
        streak: result?.streak || 0,
      });

      if (newBadges.length > 0) {
        setBadgeData(newBadges[0]);
        setTimeout(() => setShowBadge(true), showLevelUp ? 2000 : 1000);
      }
    } catch (e) {
      console.warn('Gamification hatası:', e);
    }
  };

  const handleClose = () => {
    navigation.reset({index: 0, routes: [{name: 'Camera' as never}]});
    (navigation as any).getParent()?.navigate('Dashboard');
  };

  const pointsTranslate = pointsAnim.interpolate({inputRange: [0, 1], outputRange: [50, 0]});

  return (
    <View style={styles.container}>
      <View style={{paddingTop: insets.top, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border}}>
        <FlowStepper currentStep={3} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.topSection, {transform: [{scale: scaleAnim}]}]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✅</Text>
          </View>
          <Text style={styles.title}>İhbar Oluşturuldu</Text>
          <Text style={styles.subtitle}>Katkı için teşekkürler</Text>
          <View style={styles.pipelineBadge}>
            <Text style={styles.pipelineDot}>●</Text>
            <Text style={styles.pipelineText}>@parkihbar inceliyor · onaylanırsa X'te yayınlanacak</Text>
          </View>
          <Text style={styles.blurNote}>Fotoğraftaki yüzler otomatik bulanıklaştırılır</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.pointsContainer,
            {opacity: pointsAnim, transform: [{translateY: pointsTranslate}]},
          ]}>
          <Text style={styles.pointsLabel}>Katkı Puanı</Text>
          <Text style={styles.points}>+{points}</Text>
        </Animated.View>

        <View style={styles.divider} />

        <ShareSheet info={shareInfo} />

        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </ScrollView>

      {levelUpData && (
        <LevelUpPopup
          visible={showLevelUp}
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
          oldLevelInfo={levelUpData.oldLevelInfo}
          newLevelInfo={levelUpData.newLevelInfo}
          onClose={() => {
            setShowLevelUp(false);
            if (badgeData) {setTimeout(() => setShowBadge(true), 500);}
          }}
        />
      )}
      {badgeData && (
        <BadgePopup visible={showBadge} badge={badgeData} onClose={() => setShowBadge(false)} />
      )}
    </View>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    scrollContent: {padding: 20, paddingTop: 24, paddingBottom: 40},
    topSection: {alignItems: 'center', marginBottom: 20},
    iconContainer: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    icon: {fontSize: 56},
    title: {fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 6},
    subtitle: {fontSize: 15, color: colors.textSecondary, marginBottom: 10},
    pipelineBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.primary + '40',
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
      marginTop: 2,
    },
    pipelineDot: {fontSize: 8, color: colors.primary},
    pipelineText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
    blurNote: {fontSize: 11, color: colors.textSecondary, marginTop: 8},
    pointsContainer: {
      backgroundColor: colors.card, paddingHorizontal: 28, paddingVertical: 14,
      borderRadius: 16, marginBottom: 20, alignItems: 'center',
      borderWidth: 2, borderColor: colors.primary, alignSelf: 'center',
    },
    pointsLabel: {fontSize: 13, color: colors.textSecondary, marginBottom: 4},
    points: {fontSize: 32, fontWeight: 'bold', color: colors.primary},
    divider: {width: '100%', height: 1, backgroundColor: colors.border, marginVertical: 16},
    closeButton: {
      marginTop: 24, backgroundColor: colors.primary,
      paddingHorizontal: 48, paddingVertical: 16, borderRadius: 12, alignSelf: 'center',
    },
    closeButtonText: {color: colors.background, fontSize: 16, fontWeight: '600'},
  });
