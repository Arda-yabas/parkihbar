import React, {useMemo} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {CAUSES} from '../../../constants/causes';
import {FirestoreService} from '../../../services/firebase';

export const DonationsScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleDonate = (causeId: string, url: string) => {
    FirestoreService.incrementDonationClick(causeId).catch(() => {});
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Destekle</Text>
          <Text style={styles.subtitle}>parkihbar topluluğu olarak destek oluyoruz</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            💡 Aşağıdaki butonlar sizi ilgili kuruluşun resmi bağış sayfasına yönlendirir. parkihbar herhangi bir ödeme almaz.
          </Text>
        </View>

        {CAUSES.map(cause => (
          <View key={cause.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardIcon}>{cause.icon}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardTitle}>{cause.title}</Text>
                <Text style={styles.cardOrg}>{cause.org}</Text>
              </View>
              <TouchableOpacity
                style={styles.donateBtn}
                onPress={() => handleDonate(cause.id, cause.url)}
                activeOpacity={0.8}>
                <Text style={styles.donateBtnText}>Bağış Yap</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardDesc}>{cause.desc}</Text>
          </View>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, paddingTop: 60, backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: {width: 36, height: 36, justifyContent: 'center'},
  backIcon: {fontSize: 32, color: colors.primary, fontWeight: '300', lineHeight: 36},
  title: {fontSize: 22, fontWeight: '800', color: colors.text},
  subtitle: {fontSize: 13, color: colors.textSecondary, marginTop: 2},
  scroll: {flex: 1, padding: 16},
  notice: {
    backgroundColor: colors.accentLight,
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  noticeText: {fontSize: 13, color: colors.accent, fontWeight: '500', lineHeight: 18},
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  cardIcon: {fontSize: 34, marginRight: 12},
  cardMeta: {flex: 1},
  cardTitle: {fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2},
  cardOrg: {fontSize: 12, color: colors.textSecondary},
  cardDesc: {fontSize: 13, color: colors.textSecondary, lineHeight: 18, paddingLeft: 46},
  donateBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  donateBtnText: {fontSize: 13, fontWeight: '700', color: '#FFFFFF'},
});
