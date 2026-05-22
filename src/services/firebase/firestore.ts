import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface Comment {
  id?: string;
  text: string;
  userName: string;
  userId?: string;
  createdAt: any;
}

export interface Report {
  id?: string;
  type: string;
  photoUrl: string;
  location: {latitude: number; longitude: number; address: string; city?: string; district?: string};
  note?: string;
  points: number;
  status: string;
  userName: string;
  createdAt: any;
  seenCount?: number;
}

interface ReportData {
  type: string;
  photoUrl: string;
  photoUrls?: string[];
  location: {latitude: number; longitude: number; address: string; city?: string; district?: string};
  note?: string;
  points: number;
}

export const FirestoreService = {
  async createReport(data: ReportData): Promise<string> {
    const uid = auth().currentUser?.uid ?? null;
    const location = Object.fromEntries(
      Object.entries(data.location as Record<string, any>).filter(([, v]) => v !== undefined),
    );
    const doc: Record<string, any> = {
      type: data.type,
      photoUrl: data.photoUrl,
      photoUrls: data.photoUrls ?? [data.photoUrl],
      location,
      points: data.points,
      createdAt: firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      userId: uid,
    };
    if (data.note) {
      doc.note = data.note;
    }
    const ref = await firestore().collection('reports').add(doc);

    // Kullanıcının lastReportDate'ini güncelle (leaderboard filtresi için)
    if (uid) {
      await firestore()
        .collection('users')
        .doc(uid)
        .set({lastReportDate: firestore.FieldValue.serverTimestamp()}, {merge: true});
    }

    return ref.id;
  },

  async getLeaderboard(limit: number, period: 'today' | 'week' | 'month' = 'week'): Promise<Partial<Report>[]> {
    const snapshot = await (firestore().collection('users') as any)
      .orderBy('points', 'desc')
      .limit(200)
      .get();

    const all = snapshot.docs.map((doc: any) => ({id: doc.id, ...doc.data()}));

    const msBack =
      period === 'today' ? 24 * 60 * 60 * 1000
      : period === 'week' ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - msBack;
    return all
      .filter((u: any) => {
        if (!u.lastReportDate) {return false;}
        const ms = u.lastReportDate.toMillis ? u.lastReportDate.toMillis() : Number(u.lastReportDate);
        return ms >= cutoff;
      })
      .slice(0, limit);
  },

  async getUserData(uid: string): Promise<Record<string, any> | null> {
    const doc = await firestore().collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return {id: doc.id, ...doc.data()};
  },

  async getUserReports(userId: string, limitCount = 100): Promise<Report[]> {
    const snapshot = await firestore()
      .collection('reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Report));
  },

  async getMyReports(userId: string, limit: number): Promise<Report[]> {
    const snapshot = await firestore()
      .collection('reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      userName: 'Ben',
      ...doc.data(),
    } as Report));
  },

  async getTodayReportCount(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const snapshot = await firestore()
      .collection('reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    const count = snapshot.docs.filter(doc => {
      const ts = doc.data().createdAt;
      if (!ts) return false;
      const ms = ts.toMillis ? ts.toMillis() : Number(ts);
      return ms >= todayStart.getTime();
    }).length;
    return Math.min(count, 3);
  },

  async getThisWeekReportCount(userId: string): Promise<number> {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    // Pazartesi başlangıç
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
    const snapshot = await firestore()
      .collection('reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    const count = snapshot.docs.filter(doc => {
      const ts = doc.data().createdAt;
      if (!ts) return false;
      const ms = ts.toMillis ? ts.toMillis() : Number(ts);
      return ms >= weekStart.getTime();
    }).length;
    return Math.min(count, 3);
  },

  async getReport(reportId: string): Promise<Report | null> {
    const doc = await firestore().collection('reports').doc(reportId).get();
    if (!doc.exists) return null;
    return {id: doc.id, userName: 'Anonim', ...doc.data()} as Report;
  },

  async getNearbyReports(limit: number): Promise<Report[]> {
    const snapshot = await firestore()
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      userName: 'Anonim',
      ...doc.data(),
    } as Report));
  },

  // "Ben de Gördüm" bastığında seenCount arttır, 3'e ulaşınca verified yap
  async incrementSeenCount(reportId: string): Promise<{newCount: number; newStatus: string}> {
    const ref = firestore().collection('reports').doc(reportId);
    let newCount = 0;
    let newStatus = 'pending';
    let reportUserId: string | null = null;
    await firestore().runTransaction(async tx => {
      const doc = await tx.get(ref);
      const current = (doc.data()?.seenCount ?? 0) as number;
      newCount = current + 1;
      reportUserId = doc.data()?.userId ?? null;
      const update: Record<string, any> = {seenCount: newCount};
      if (newCount >= 3 && doc.data()?.status === 'pending') {
        update.status = 'verified';
        newStatus = 'verified';
      } else {
        newStatus = doc.data()?.status ?? 'pending';
      }
      tx.update(ref, update);
    });
    // İhbar verified'a geçtiyse sahibinin verifiedReports sayacını artır
    if (newStatus === 'verified' && reportUserId) {
      firestore().collection('users').doc(reportUserId)
        .set({verifiedReports: firestore.FieldValue.increment(1)}, {merge: true})
        .catch(() => {});
    }
    // Her görülmede ihbar sahibinin toplam etki sayacını artır
    if (reportUserId) {
      firestore().collection('users').doc(reportUserId)
        .set({totalSeenImpact: firestore.FieldValue.increment(1)}, {merge: true})
        .catch(() => {});
    }
    return {newCount, newStatus};
  },

  async getComments(reportId: string): Promise<Comment[]> {
    const snapshot = await firestore()
      .collection('reports')
      .doc(reportId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Comment));
  },

  async addComment(reportId: string, text: string, userName: string, userId?: string): Promise<Comment> {
    const doc: Record<string, any> = {
      text,
      userName,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (userId) doc.userId = userId;
    const ref = await firestore()
      .collection('reports')
      .doc(reportId)
      .collection('comments')
      .add(doc);
    return {id: ref.id, text, userName, userId, createdAt: new Date()};
  },

  async deleteComment(reportId: string, commentId: string): Promise<void> {
    await firestore()
      .collection('reports')
      .doc(reportId)
      .collection('comments')
      .doc(commentId)
      .delete();
  },

  async getNotifications(userId: string, limitCount = 50) {
    const snapshot = await firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .limit(limitCount)
      .get();
    const docs = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as any));
    docs.sort((a: any, b: any) => {
      const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : Number(a.createdAt ?? 0);
      const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : Number(b.createdAt ?? 0);
      return bMs - aMs;
    });
    return docs;
  },

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const snapshot = await firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    return snapshot.docs.length;
  },

  async markNotificationRead(notifId: string) {
    await firestore().collection('notifications').doc(notifId).update({read: true});
  },

  async markAllNotificationsRead(userId: string) {
    const snapshot = await firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    const batch = firestore().batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, {read: true}));
    await batch.commit();
  },

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, any> = {},
  ) {
    await firestore().collection('notifications').add({
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
      metadata,
    });
  },

  // Ekran açıldığında: 10 dakika geçmişse pending → verified (transaction ile race condition koruması)
  async checkAndAutoVerify(reportId: string, createdAt: any): Promise<string> {
    const createdMs: number = createdAt?.toMillis ? createdAt.toMillis() : Number(createdAt);
    if (!createdMs) return 'pending';
    if (Date.now() - createdMs < 10 * 60 * 1000) return 'pending';

    const reportRef = firestore().collection('reports').doc(reportId);
    let finalStatus = 'pending';
    let ownerUid: string | null = null;
    let didVerify = false;

    await firestore().runTransaction(async tx => {
      const doc = await tx.get(reportRef);
      const data = doc.data();
      if (data?.status === 'pending') {
        tx.update(reportRef, {status: 'verified'});
        finalStatus = 'verified';
        ownerUid = data.userId ?? null;
        didVerify = true;
      } else {
        finalStatus = data?.status ?? 'pending';
      }
    });

    if (didVerify && ownerUid) {
      firestore().collection('users').doc(ownerUid)
        .set({verifiedReports: firestore.FieldValue.increment(1)}, {merge: true})
        .catch(() => {});
    }

    return finalStatus;
  },

  async notifySeenIt(reportId: string, reportUserId: string, viewerName: string): Promise<void> {
    await firestore().collection('notifications').add({
      userId: reportUserId,
      type: 'social',
      title: '👍 Biri ihbarını onayladı',
      message: `${viewerName} ihbarını gördüğünü bildirdi.`,
      read: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
      metadata: {reportId},
    });
  },

  // ── Gerçek zamanlı dinleyiciler ──────────────────────────────────────────────

  listenUserData(uid: string, cb: (data: Record<string, any> | null) => void): () => void {
    return firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(
        doc => cb(doc.data() ? {id: doc.id, ...doc.data()} : null),
        () => cb(null),
      );
  },

  listenReports(limit: number, cb: (reports: Report[]) => void): () => void {
    return firestore()
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .onSnapshot(
        snap => cb(snap.docs.map(doc => ({id: doc.id, userName: 'Anonim', ...doc.data()} as Report))),
        () => {},
      );
  },

  listenUserReports(uid: string, limit: number, cb: (reports: Report[]) => void): () => void {
    return firestore()
      .collection('reports')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .onSnapshot(
        snap => cb(snap.docs.map(doc => ({id: doc.id, userName: 'Ben', ...doc.data()} as Report))),
        () => {},
      );
  },

  listenUnreadCount(uid: string, cb: (count: number) => void): () => void {
    return firestore()
      .collection('notifications')
      .where('userId', '==', uid)
      .where('read', '==', false)
      .onSnapshot(
        snap => cb(snap.docs.length),
        () => {},
      );
  },

  listenLeaderboard(cb: (users: any[]) => void): () => void {
    return (firestore().collection('users') as any)
      .orderBy('points', 'desc')
      .limit(200)
      .onSnapshot(
        (snap: any) => cb(snap.docs.map((doc: any) => ({id: doc.id, ...doc.data()}))),
        () => {},
      );
  },

  async getDonationClickCount(causeId: string): Promise<number> {
    const doc = await firestore().doc(`donations/${causeId}`).get();
    return (doc.data()?.count as number) ?? 0;
  },

  async incrementDonationClick(causeId: string): Promise<void> {
    await firestore()
      .doc(`donations/${causeId}`)
      .set({count: firestore.FieldValue.increment(1)}, {merge: true});
  },

  async incrementUserSeenItCount(userId: string): Promise<void> {
    await firestore().collection('users').doc(userId)
      .set({seenItCount: firestore.FieldValue.increment(1)}, {merge: true});
  },

  async incrementUserCommentsCount(userId: string): Promise<void> {
    await firestore().collection('users').doc(userId)
      .set({commentsCount: firestore.FieldValue.increment(1)}, {merge: true});
  },
};
