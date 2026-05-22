export interface ReportTemplate {
  name: string;
  emoji: string;
  title: string;
  description: string;
  hashtags: string;
  egmCategory: string;
}

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  kaldırım: {
    name: 'Kaldırıma Park',
    emoji: '🚶',
    title: 'KALDIRIMA PARK',
    description: 'Kaldırıma park edilmiş araç nedeniyle yayalar yoldan geçmek zorunda kalıyor.',
    hashtags: '#Kaldırım #YayaGüvenliği #YanlışPark',
    egmCategory: 'Trafik İhlali - Kaldırım İşgali',
  },
  yaya_gecidi: {
    name: 'Yaya Geçidine Park',
    emoji: '🚸',
    title: 'YAYA GEÇİDİNE PARK',
    description: 'Yaya geçidine park eden araç, yaya geçişini engelliyor ve güvenliği tehlikeye atıyor.',
    hashtags: '#YayaGeçidi #TrafikGüvenliği #YanlışPark',
    egmCategory: 'Trafik İhlali - Yaya Geçidi İşgali',
  },
  engelli: {
    name: 'Engelli Yerine Park',
    emoji: '♿',
    title: 'ENGELLİ PARK YERİ İŞGALİ',
    description: 'Engelli park yerine izinsiz park eden araç.',
    hashtags: '#EngelliHakları #YanlışPark',
    egmCategory: 'Trafik İhlali - Engelli Park Yeri',
  },
  yangin_muslugu: {
    name: 'Yangın Musluğu Önü',
    emoji: '🚒',
    title: 'YANGIN MUSLUĞU ÖNÜ',
    description: 'Yangın musluğu önüne park eden araç, acil durumlarda itfaiye müdahalesini engelliyor.',
    hashtags: '#YangınGüvenliği #AcilMüdahale #YanlışPark',
    egmCategory: 'Trafik İhlali - Yangın Musluğu Önü',
  },
  otobus_duragi: {
    name: 'Otobüs Durağı',
    emoji: '🚌',
    title: 'OTOBÜS DURAĞI',
    description: 'Otobüs durağına park eden araç, toplu taşımayı engelliyor.',
    hashtags: '#TopluTaşıma #YanlışPark',
    egmCategory: 'Trafik İhlali - Otobüs Durağı',
  },
  yasak_bolge: {
    name: 'Yasak Bölge',
    emoji: '🚫',
    title: 'YASAK BÖLGE',
    description: 'Park yasağı olan bölgeye izinsiz park edilmiş araç.',
    hashtags: '#ParkYasağı #YanlışPark',
    egmCategory: 'Trafik İhlali - Park Yasağı',
  },
  cift_sira: {
    name: 'Çift Sıra Park',
    emoji: '🚗',
    title: 'ÇİFT SIRA PARK',
    description: 'Çift sıra park eden araç trafiği engelliyor ve diğer araçların geçişini zorlaştırıyor.',
    hashtags: '#ÇiftSıraPark #TrafikEngeli #YanlışPark',
    egmCategory: 'Trafik İhlali - Çift Sıra Park',
  },
  kapi_onu: {
    name: 'Kapı/Çıkış Önü',
    emoji: '🏠',
    title: 'KAPI VEYA ÇIKIŞ ÖNÜ',
    description: 'Bina girişi, garaj veya çıkış kapısı önüne park edilmiş araç.',
    hashtags: '#KapıÖnüPark #GarajEngellemesi #YanlışPark',
    egmCategory: 'Trafik İhlali - Kapı/Çıkış Önü',
  },
  bisiklet_yolu: {
    name: 'Bisiklet Yolu',
    emoji: '🚴',
    title: 'BİSİKLET YOLU İŞGALİ',
    description: 'Bisiklet yoluna park eden araç bisikletlilerin güvenliğini tehlikeye atıyor.',
    hashtags: '#BisikletYolu #BisikletGüvenliği #YanlışPark',
    egmCategory: 'Trafik İhlali - Bisiklet Yolu',
  },
  diger: {
    name: 'Diğer',
    emoji: '📝',
    title: 'YANLIŞ PARK',
    description: 'Park ihlali tespit edildi.',
    hashtags: '#YanlışPark',
    egmCategory: 'Trafik İhlali',
  },
};

const LEGACY_MAP: Record<string, string> = {
  disabled: 'engelli',
  sidewalk: 'kaldırım',
  crosswalk: 'yaya_gecidi',
  bike: 'diger',
  other: 'diger',
};

export const getTemplate = (type: string): ReportTemplate =>
  REPORT_TEMPLATES[type] ?? REPORT_TEMPLATES[LEGACY_MAP[type]] ?? REPORT_TEMPLATES.diger;

export const CATEGORY_OPTIONS = [
  {value: 'kaldırım',       label: 'Kaldırıma Park',     icon: '🚶'},
  {value: 'yaya_gecidi',    label: 'Yaya Geçidine Park', icon: '🚸'},
  {value: 'engelli',        label: 'Engelli Yerine Park', icon: '♿'},
  {value: 'yangin_muslugu', label: 'Yangın Musluğu Önü', icon: '🚒'},
  {value: 'otobus_duragi',  label: 'Otobüs Durağı',      icon: '🚌'},
  {value: 'yasak_bolge',    label: 'Yasak Bölge',        icon: '🚫'},
  {value: 'cift_sira',      label: 'Çift Sıra Park',     icon: '🚗'},
  {value: 'kapi_onu',       label: 'Kapı/Çıkış Önü',    icon: '🏠'},
  {value: 'bisiklet_yolu',  label: 'Bisiklet Yolu',      icon: '🚴'},
  {value: 'diger',          label: 'Diğer',              icon: '📝'},
] as const;
