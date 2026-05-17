import React from 'react';
import {TouchableOpacity, Text, StyleSheet, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../theme/ThemeContext';

interface Props {
  onPress?: () => void;
  color?: string;
}

export const BackButton: React.FC<Props> = ({onPress, color}) => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const tint = color ?? colors.primary;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress ?? (() => navigation.goBack())}
      hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
      activeOpacity={0.6}>
      <Text style={[styles.icon, {color: tint}]}>
        {Platform.OS === 'ios' ? '‹' : '←'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: Platform.OS === 'ios' ? 38 : 26,
    fontWeight: '300',
    lineHeight: Platform.OS === 'ios' ? 42 : 30,
    marginTop: Platform.OS === 'ios' ? -4 : 0,
  },
});
