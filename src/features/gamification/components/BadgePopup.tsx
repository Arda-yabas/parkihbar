import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, Animated} from 'react-native';
import Modal from 'react-native-modal';
import {lightColors as colors} from '../../../theme/ThemeContext';

interface BadgePopupProps {
  visible: boolean;
  badge: {name: string; icon: string; description: string} | null;
  onClose: () => void;
}

export const BadgePopup: React.FC<BadgePopupProps> = ({visible, badge, onClose}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
        Animated.timing(rotateAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible, scaleAnim, rotateAnim]);

  if (!badge) return null;

  const rotate = rotateAnim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.7}
      animationIn="fadeIn"
      animationOut="fadeOut">
      <Animated.View style={[styles.container, {transform: [{scale: scaleAnim}]}]}>
        <View style={styles.content}>
          <Text style={styles.title}>Başarı Rozeti</Text>

          <Animated.View style={[styles.badgeCircle, {transform: [{rotate}]}]}>
            <Text style={styles.badgeEmoji}>{badge.icon}</Text>
          </Animated.View>

          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgeDescription}>{badge.description}</Text>
          <Text style={styles.message}>Topluluk için teşekkür ederiz 🙏</Text>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Tamam</Text>
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
  title: {fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 24},
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  badgeEmoji: {fontSize: 60},
  badgeName: {fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8},
  badgeDescription: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 12},
  message: {fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24},
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
