import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, Animated} from 'react-native';
import Modal from 'react-native-modal';
import {lightColors as colors} from '../../../theme/ThemeContext';

interface LevelUpPopupProps {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  oldLevelInfo: {name: string; icon: string};
  newLevelInfo: {name: string; icon: string};
  onClose: () => void;
}

export const LevelUpPopup: React.FC<LevelUpPopupProps> = ({
  visible,
  oldLevelInfo,
  newLevelInfo,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
        Animated.timing(fadeAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.7}
      animationIn="fadeIn"
      animationOut="fadeOut">
      <Animated.View style={[styles.container, {transform: [{scale: scaleAnim}], opacity: fadeAnim}]}>
        <View style={styles.content}>
          <Text style={styles.title}>Katkı Seviyeniz Arttı</Text>

          <View style={styles.levelTransition}>
            <View style={styles.levelBox}>
              <Text style={styles.levelIcon}>{oldLevelInfo.icon}</Text>
              <Text style={styles.levelName}>{oldLevelInfo.name}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={[styles.levelBox, styles.levelBoxNew]}>
              <Text style={styles.levelIcon}>{newLevelInfo.icon}</Text>
              <Text style={styles.levelName}>{newLevelInfo.name}</Text>
            </View>
          </View>

          <Text style={styles.message}>Şehriniz için fark yaratıyorsunuz 💚</Text>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Devam Et</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {justifyContent: 'center', alignItems: 'center'},
  content: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    width: '90%',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  levelTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  levelBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    minWidth: 100,
  },
  levelBoxNew: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  levelIcon: {fontSize: 48, marginBottom: 8},
  levelName: {fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center'},
  arrow: {fontSize: 28, color: colors.primary, marginHorizontal: 12},
  message: {fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24},
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
