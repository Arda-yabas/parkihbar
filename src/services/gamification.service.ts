import firestore from '@react-native-firebase/firestore';

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 2000];

const LEVEL_NAMES: Record<number, {name: string; icon: string}> = {
  1: {name: 'Gözlemci', icon: '🌱'},
  2: {name: 'Sokak Koruyucusu', icon: '🎯'},
  3: {name: 'Mahalle Kahramanı', icon: '🏘️'},
  4: {name: 'Şehir Koruyucusu', icon: '🏙️'},
  5: {name: 'Kent Savunucusu', icon: '⭐'},
  6: {name: 'Değişim Öncüsü', icon: '🏆'},
};

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
  type: 'reports' | 'verified' | 'streak';
}

const BADGES: Badge[] = [
  {id: 'first_step', name: 'İlk Adım', icon: '🎯', description: 'İlk ihbarınızı oluşturdunuz', requirement: 1, type: 'reports'},
  {id: 'sharp_eye', name: 'Keskin Göz', icon: '📸', description: '10 ihbar oluşturdunuz', requirement: 10, type: 'reports'},
  {id: 'fiery_mission', name: 'Ateşli Görev', icon: '🔥', description: '50 ihbar oluşturdunuz', requirement: 50, type: 'reports'},
  {id: 'hundred', name: 'Yüz İhbar', icon: '💯', description: '100 ihbar oluşturdunuz', requirement: 100, type: 'reports'},
];

export class GamificationService {
  static calculateLevel(points: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (points >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  }

  static getLevelInfo(level: number) {
    return LEVEL_NAMES[level] ?? LEVEL_NAMES[1];
  }

  static getNextLevelPoints(level: number): number {
    if (level >= 6) return LEVEL_THRESHOLDS[5];
    return LEVEL_THRESHOLDS[level];
  }

  static async addPoints(userId: string, points: number) {
    const userRef = firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      // Create user document if it doesn't exist
      await userRef.set({
        points,
        level: 1,
        totalReports: 1,
        verifiedReports: 0,
        streak: 0,
        badges: [],
        lastReportDate: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      return {oldPoints: 0, newPoints: points, oldLevel: 1, newLevel: 1, leveledUp: false, totalReports: 1, verifiedReports: 0, streak: 0};
    }

    const oldPoints = userData.points || 0;
    const newPoints = oldPoints + points;
    const oldLevel = userData.level || 1;
    const newLevel = this.calculateLevel(newPoints);
    const totalReports = (userData.totalReports || 0) + 1;
    const verifiedReports = userData.verifiedReports || 0;
    const streak = userData.streak || 0;

    await userRef.update({
      points: newPoints,
      level: newLevel,
      totalReports: firestore.FieldValue.increment(1),
      lastReportDate: firestore.FieldValue.serverTimestamp(),
    });

    return {oldPoints, newPoints, oldLevel, newLevel, leveledUp: newLevel > oldLevel, totalReports, verifiedReports, streak};
  }

  static async checkNewBadges(
    userId: string,
    stats: {totalReports: number; verifiedReports: number; streak: number},
  ): Promise<Badge[]> {
    const userDoc = await firestore().collection('users').doc(userId).get();
    const earnedBadges: string[] = userDoc.data()?.badges || [];
    const newBadges: Badge[] = [];

    for (const badge of BADGES) {
      if (earnedBadges.includes(badge.id)) continue;

      const earned =
        badge.type === 'reports' ? stats.totalReports >= badge.requirement :
        badge.type === 'verified' ? stats.verifiedReports >= badge.requirement :
        stats.streak >= badge.requirement;

      if (earned) {
        newBadges.push(badge);
        await firestore().collection('users').doc(userId).update({
          badges: firestore.FieldValue.arrayUnion(badge.id),
        });
      }
    }

    return newBadges;
  }
}
