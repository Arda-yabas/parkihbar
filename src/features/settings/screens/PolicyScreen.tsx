import React, {useMemo} from 'react';
import {ScrollView, View, Text, StyleSheet} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {BackButton} from '../../../components/BackButton';

type PolicyScreenRouteProp = RouteProp<{Policy: {type: 'privacy' | 'terms'}}, 'Policy'>;

const PRIVACY_POLICY = `Son Güncelleme: Mayıs 2026

parkihbar olarak gizliliğinize önem veriyoruz. Bu politika, uygulamamızı kullandığınızda hangi verileri topladığımızı ve nasıl kullandığımızı açıklar.

1. Toplanan Veriler
• Konum bilgisi (ihbar oluştururken, yalnızca ihbar kaydedilirken)
• Fotoğraf (yalnızca ihbar için yüklenen görseller)
• Kullanıcı adı (isteğe bağlı, anonim seçeneği mevcuttur)
• Firebase Anonymous Authentication kimliği

2. Verilerin Kullanımı
Toplanan veriler yalnızca ihbar süreçleri için kullanılır. Üçüncü taraf reklam veya analiz şirketleriyle paylaşılmaz.

3. Fotoğraf İşleme
Yüklenen fotoğraflardaki yüzler, moderasyon sürecinde otomatik olarak bulanıklaştırılır. Araç plakaları değiştirilmez.

4. Onaylanan İhbarlar
Moderatörlerimiz tarafından onaylanan ihbarlar @parkihbar X hesabında paylaşılabilir. Bu süreçte yüzler bulanıklaştırılmış halde yayınlanır.

5. Veri Saklama
İhbar verileri, kamu yararı amacıyla Firestore veritabanında saklanır. Hesabınızı sildiğinizde kişisel verileriniz kaldırılır.

6. İletişim
Sorularınız için: info@parkihbar.com`;

const TERMS_OF_USE = `Son Güncelleme: Mayıs 2026

parkihbar uygulamasını kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.

1. Kullanım Amacı
Bu uygulama, park ihlallerini belgelemek ve yetkili mercilere iletmek amacıyla tasarlanmıştır. Başka amaçlarla kullanılamaz.

2. Doğru Bilgi
Kullanıcılar yalnızca gerçekten gözlemledikleri ihlalleri bildirmelidir. Asılsız ihbar oluşturmak yasaktır ve hesabınız askıya alınabilir.

3. Fotoğraf İçeriği
Yüklenen fotoğraflar yalnızca araç ve park ihlalini göstermelidir. Kişileri kasıtlı olarak hedef alan içerikler kabul edilmez.

4. Gizlilik
Başkalarının kişisel verilerini (yüz, kimlik bilgisi) kasıtlı olarak içeren içerikler paylaşılamaz.

5. Fikri Mülkiyet
Uygulama içeriği ve tasarımı parkihbar'a aittir. İzinsiz kopyalanamaz.

6. Sorumluluk Reddi
parkihbar, ihbar edilen ihlallerin resmi makamlar tarafından işleme alınacağını garanti etmez.

7. Değişiklikler
Bu şartlar önceden bildirimde bulunmaksızın güncellenebilir. Güncel sürüm uygulama içinde yayınlanır.

8. İletişim
Sorularınız için: info@parkihbar.com`;

export const PolicyScreen = () => {
  const route = useRoute<PolicyScreenRouteProp>();
  const {type} = route.params;
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Gizlilik Politikası' : 'Kullanım Şartları';
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_USE;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.text}>{content}</Text>
        <View style={{height: insets.bottom + 20}} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  headerRight: {width: 40},
  scroll: {flex: 1},
  content: {padding: 20},
  text: {fontSize: 14, color: colors.text, lineHeight: 24},
});
