import {getTemplate} from '../constants/reportTemplates';

export interface ShareInfo {
  photoUrl: string;
  localPhotoUri?: string;
  type: string;
  location: {
    address: string;
    district?: string;
    city?: string;
    neighbourhood?: string;
    road?: string;
    latitude?: number;
    longitude?: number;
  };
  note?: string;
}

export const generateMessage = (
  info: ShareInfo,
  platform: 'whatsapp' | 'email' | 'instagram' | 'twitter' | 'egm',
): string => {
  if (!info || !info.location) {return '';}

  const template = getTemplate(info.type ?? 'diger');
  const now = new Date();
  const formattedDate = now.toLocaleDateString('tr-TR');
  const formattedTime = now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});

  const locationStr =
    [info.location.address, info.location.district, info.location.city]
      .filter(v => v && v.trim())
      .join(', ') || 'Konum belirtilmedi';

  const mapsUrl =
    info.location.latitude && info.location.longitude
      ? `https://maps.google.com/?q=${info.location.latitude},${info.location.longitude}`
      : null;

  const emoji = template.emoji ?? '📍';
  const title = template.title ?? 'YANLIŞ PARK';
  const description = template.description ?? 'Park ihlali tespit edildi.';
  const hashtags = template.hashtags ?? '#YanlışPark';
  const egmCategory = template.egmCategory ?? 'Trafik İhlali';

  if (platform === 'whatsapp') {
    let msg = `🚨 *PARK İHBARI*\n\n`;
    msg += `${emoji} *İhlal:* ${title}\n`;
    msg += `${description}\n\n`;
    msg += `📍 *Konum:* ${locationStr}\n`;
    if (mapsUrl) {msg += `🗺️ ${mapsUrl}\n`;}
    msg += `📅 *Tarih:* ${formattedDate} ${formattedTime}\n`;
    if (info.note) {msg += `📝 *Not:* ${info.note}\n`;}
    if (info.photoUrl) {msg += `📸 *Fotoğraf:* ${info.photoUrl}\n`;}
    msg += `\n${hashtags}`;
    msg += '\n\n📲 Bu ihbar *parkihbar* uygulamasıyla oluşturulmuştur.\nYetkililere iletmenizi rica ederiz.';
    return msg;
  }

  if (platform === 'twitter') {
    let msg = `${emoji} ${title}\n\n`;
    msg += `📍 ${locationStr}\n`;
    if (mapsUrl) {msg += `🗺️ ${mapsUrl}\n`;}
    msg += `📅 ${formattedDate}\n`;
    if (info.note) {msg += `📝 ${info.note}\n`;}
    if (info.photoUrl) {msg += `📸 ${info.photoUrl}\n`;}
    msg += `\n${hashtags} @parkihbar @EmniyetGM\n\n`;
    msg += '#parkihbar uygulamasıyla bildirildi.';
    return msg;
  }

  if (platform === 'instagram') {
    let msg = `${emoji} ${title}\n\n`;
    msg += `${description}\n\n`;
    msg += `📍 Konum: ${locationStr}\n`;
    if (mapsUrl) {msg += `🗺️ ${mapsUrl}\n`;}
    msg += `📅 ${formattedDate} ${formattedTime}\n`;
    if (info.note) {msg += `📝 Not: ${info.note}\n`;}
    msg += `\n${hashtags}\n@parkihbar`;
    return msg;
  }

  if (platform === 'email') {
    let msg = `${title}\n\n`;
    msg += `${description}\n\n`;
    msg += 'DETAYLAR:\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += `📍 Konum: ${locationStr}\n`;
    if (mapsUrl) {msg += `🗺️ Haritada Aç: ${mapsUrl}\n`;}
    msg += `📅 Tarih: ${formattedDate}\n`;
    msg += `🕐 Saat: ${formattedTime}\n`;
    if (info.note) {msg += `📝 Not: ${info.note}\n`;}
    msg += '\n\nFotoğraf ektedir.\n\nparkihbar uygulamasından gönderildi.';
    return msg;
  }

  if (platform === 'egm') {
    const adres = [info.location.road, info.location.neighbourhood, info.location.district, info.location.city]
      .filter(v => v && v.trim())
      .join(', ');
    let msg = adres ? `${adres} adresinde ${title} tespit edilmistir.\n\n` : `${title} tespit edilmistir.\n\n`;
    msg += `${description}\n\n`;
    msg += `Konum: ${locationStr}\n`;
    if (mapsUrl) {msg += `Harita: ${mapsUrl}\n`;}
    msg += `Tarih: ${formattedDate} ${formattedTime}\n`;
    if (info.note) {msg += `Not: ${info.note}\n`;}
    msg += `\nKategori: ${egmCategory}\nparkihbar uygulamasindan gonderildi.`;
    return msg;
  }

  return '';
};
