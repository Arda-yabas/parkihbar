export const messages = {
  auth: {
    loginSuccess: 'Hoş geldiniz!',
    loginError: 'Giriş başarısız. Lütfen tekrar deneyin.',
    logoutSuccess: 'Başarıyla çıkış yapıldı.',
  },
  reports: {
    createSuccess: 'İhbar başarıyla kaydedildi!',
    createError: 'İhbar kaydedilemedi. Lütfen tekrar deneyin.',
    verifySuccess: 'Doğrulama eklendi!',
  },
  gamification: {
    pointsEarned: (points: number) => `+${points} puan kazandınız!`,
    badgeUnlocked: (badge: string) => `${badge} rozeti açıldı!`,
    levelUp: (level: number) => `Seviye ${level}'e yükseldiniz!`,
  },
  errors: {
    network: 'İnternet bağlantısı yok.',
    unknown: 'Bir hata oluştu.',
    permission: 'İzin gerekli.',
  },
} as const;
