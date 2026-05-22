export interface Cause {
  id: string;
  icon: string;
  title: string;
  org: string;
  desc: string;
  url: string;
}

export const CAUSES: Cause[] = [
  {
    id: 'haytap',
    icon: '🐾',
    title: 'Sokak Hayvanları',
    org: 'HAYTAP',
    desc: 'Türkiye genelinde sokak hayvanlarının rehabilitasyonu ve haklarının korunması için çalışıyor.',
    url: 'https://www.haytap.org/bagis?utm_source=parkihbar&utm_medium=app',
  },
  {
    id: 'kizilay',
    icon: '🔴',
    title: 'Afet Yardımı',
    org: 'Kızılay',
    desc: 'Deprem, sel ve yangın gibi afetlerde ihtiyaç sahiplerine acil yardım ulaştırıyor.',
    url: 'https://www.kizilay.org.tr/Bagis?utm_source=parkihbar&utm_medium=app',
  },
  {
    id: 'tema',
    icon: '🌲',
    title: 'Çevre & Orman',
    org: 'TEMA Vakfı',
    desc: 'Erozyonla mücadele, ağaçlandırma ve doğal kaynakların korunması için faaliyet gösteriyor.',
    url: 'https://www.tema.org.tr/bagis?utm_source=parkihbar&utm_medium=app',
  },
  {
    id: 'mehmetcik',
    icon: '🎖️',
    title: 'Şehit Aileleri',
    org: 'Mehmetçik Vakfı',
    desc: 'Şehit ve gazi ailelerine eğitim, sağlık ve sosyal destek sağlıyor.',
    url: 'https://www.mehmetcik.org.tr/bagis?utm_source=parkihbar&utm_medium=app',
  },
  {
    id: 'darussafaka',
    icon: '📚',
    title: 'Eğitim',
    org: 'Darüşşafaka',
    desc: 'Maddi imkânı olmayan başarılı çocuklara yatılı eğitim imkânı sunuyor.',
    url: 'https://www.darussafaka.org/bagis?utm_source=parkihbar&utm_medium=app',
  },
  {
    id: 'akut',
    icon: '🆘',
    title: 'Arama Kurtarma',
    org: 'AKUT',
    desc: 'Gönüllü arama ve kurtarma ekibiyle afet bölgelerinde hayat kurtarıyor.',
    url: 'https://www.akut.org.tr/bagis?utm_source=parkihbar&utm_medium=app',
  },
];
