import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {lightColors as colors} from '../../../theme/ThemeContext';

export const LeaderboardScreen = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>Liderlik Tablosu</Text>
    </View>
    <ScrollView style={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.text}>En aktif kullanıcılar burada listelenecek</Text>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {backgroundColor: 'white', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 28, fontWeight: '700', color: colors.text},
  content: {flex: 1},
  placeholder: {alignItems: 'center', justifyContent: 'center', paddingVertical: 60},
  emoji: {fontSize: 64, marginBottom: 16},
  text: {fontSize: 16, color: colors.textSecondary},
});
