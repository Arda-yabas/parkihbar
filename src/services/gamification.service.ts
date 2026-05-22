import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  type: 'reports' | 'verified' | 'streak' | 'accuracy';
}

const BADGES: Badge[] = [
  {id: 'first_step',    name: 'İlk Adım',     icon: '🎯', description: 'İlk ihbarınızı oluşturdunuz',    requirement: 1,   type: 'reports'},
  {id: 'lightning',     name: 'Şimşek',        icon: '⚡', description: '5 ihbar oluşturdunuz',           requirement: 5,   type: 'reports'},
  {id: 'sharp_eye',     name: 'Keskin Göz',    icon: '📸', description: '10 ihbar oluşturdunuz',          requirement: 10,  type: 'reports'},
  {id: 'fiery_mission', name: 'Ateşli Görev',  icon: '🔥', description: '50 ihbar oluşturdunuz',          requirement: 50,  type: 'reports'},
  {id: 'hundred',       name: 'Yüz İhbar',     icon: '💯', description: '100 ihbar oluşturdunuz',         requirement: 100, type: 'reports'},
  {id: 'correct_eye',   name: 'Doğru Göz',     icon: '✅', description: '10 onaylı ihbar oluşturdunuz',   requirement: 10,  type: 'verified'},
  {id: 'eagle_eye',     name: 'Kartal Göz',    icon: '👁️', description: '%90 doğruluk oranına ulaştınız', requirement: 90,  type: 'accuracy'},
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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

  // Tüm okuma+yazma tek transaction içinde — race condition yok
  static async addPoints(userId: string, points: number) {
    const userRef = firestore().collection('users').doc(userId);
    const storedName = await AsyncStorage.getItem('@username').catch(() => null);
    const displayName = storedName || 'Kullanıcı';

    let returnVal: {
      oldPoints: number; newPoints: number;
      oldLevel: number; newLevel: number;
      leveledUp: boolean;
      totalReports: number; verifiedReports: number; streak: number;
    } = {oldPoints: 0, newPoints: points, oldLevel: 1, newLevel: 1, leveledUp: false, totalReports: 1, verifiedReports: 0, streak: 1};

    await firestore().runTransaction(async tx => {
      const userDoc = await tx.get(userRef);
      const userData = userDoc.data();

      if (!userData) {
        tx.set(userRef, {
          points,
          level: 1,
          displayName,
          totalReports: 1,
          verifiedReports: 0,
          streak: 1,
          badges: [],
          lastReportDate: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        returnVal = {oldPoints: 0, newPoints: points, oldLevel: 1, newLevel: 1, leveledUp: false, totalReports: 1, verifiedReports: 0, streak: 1};
        return;
      }

      const oldPoints = userData.points || 0;
      const newPoints = oldPoints + points;
      const oldLevel = userData.level || 1;
      const newLevel = GamificationService.calculateLevel(newPoints);
      const totalReports = (userData.totalReports || 0) + 1;
      const verifiedReports = userData.verifiedReports || 0;

      const oldStreak = userData.streak || 0;
      let newStreak = 1;
      const lastReportTs = userData.lastReportDate;
      if (lastReportTs) {
        const lastMs = lastReportTs.toMillis ? lastReportTs.toMillis() : Number(lastReportTs);
        const lastDate = new Date(lastMs);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (sameDay(lastDate, today)) {
          newStreak = oldStreak;
        } else if (sameDay(lastDate, yesterday)) {
          newStreak = oldStreak + 1;
        }
      }

      tx.update(userRef, {
        points: newPoints,
        level: newLevel,
        displayName,
        totalReports: firestore.FieldValue.increment(1),
        streak: newStreak,
        lastReportDate: firestore.FieldValue.serverTimestamp(),
      });

      returnVal = {oldPoints, newPoints, oldLevel, newLevel, leveledUp: newLevel > oldLevel, totalReports, verifiedReports, streak: newStreak};
    });

    return returnVal;
  }

  // Tüm yeni badge'leri tek bir update'e topla — N+1 write yok
  static async checkNewBadges(
    userId: string,
    stats: {totalReports: number; verifiedReports: number; streak: number},
  ): Promise<Badge[]> {
    const userDoc = await firestore().collection('users').doc(userId).get();
    const earnedBadges: string[] = userDoc.data()?.badges || [];
    const newBadges: Badge[] = [];
    const accuracy = stats.totalReports > 0
      ? Math.round((stats.verifiedReports / stats.totalReports) * 100)
      : 0;

    for (const badge of BADGES) {
      if (earnedBadges.includes(badge.id)) continue;
      const earned =
        badge.type === 'reports'  ? stats.totalReports >= badge.requirement :
        badge.type === 'verified' ? stats.verifiedReports >= badge.requirement :
        badge.type === 'accuracy' ? accuracy >= badge.requirement :
        stats.streak >= badge.requirement;
      if (earned) newBadges.push(badge);
    }

    if (newBadges.length > 0) {
      await firestore().collection('users').doc(userId).update({
        badges: firestore.FieldValue.arrayUnion(...newBadges.map(b => b.id)),
      });
    }

    return newBadges;
  }
}
