import firestore from '@react-native-firebase/firestore';

const CITIES = [
  {
    name: 'İstanbul',
    districts: ['Kadıköy', 'Beşiktaş', 'Şişli', 'Üsküdar'],
    coords: {lat: 41.0082, lon: 28.9784},
    userCount: 15,
    reportCount: 25,
  },
  {
    name: 'Ankara',
    districts: ['Çankaya', 'Keçiören', 'Mamak'],
    coords: {lat: 39.9334, lon: 32.8597},
    userCount: 8,
    reportCount: 15,
  },
  {
    name: 'İzmir',
    districts: ['Karşıyaka', 'Bornova', 'Konak'],
    coords: {lat: 38.4237, lon: 27.1428},
    userCount: 7,
    reportCount: 10,
  },
];

const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Ali',
  'Veli', 'Zeynep', 'Elif', 'Can', 'Deniz',
];

const VIOLATION_TYPES = ['disabled', 'sidewalk', 'crosswalk', 'bike', 'other'];

const PHOTO_URLS = [
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateMockData(): Promise<{users: number; reports: number}> {
  const userBatch = firestore().batch();
  const reportPromises: Promise<any>[] = [];
  let userCount = 0;
  let reportCount = 0;

  for (const city of CITIES) {
    for (let i = 0; i < city.userCount; i++) {
      const points = Math.floor(Math.random() * 800) + 50;
      const level =
        points < 100 ? 1
        : points < 300 ? 2
        : points < 600 ? 3
        : points < 1000 ? 4
        : points < 2000 ? 5
        : 6;
      const district = pick(city.districts);
      const docId = `mock_user_${userCount}`;

      userBatch.set(firestore().collection('users').doc(docId), {
        uid: docId,
        displayName: `${pick(FIRST_NAMES)}_${userCount}`,
        points,
        level,
        totalReports: Math.floor(points / 15),
        verifiedReports: Math.floor(points / 20),
        streak: Math.floor(Math.random() * 10),
        badges: [],
        city: city.name,
        district,
        location: {
          latitude: city.coords.lat + (Math.random() - 0.5) * 0.1,
          longitude: city.coords.lon + (Math.random() - 0.5) * 0.1,
        },
        isMock: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      userCount++;
    }

    for (let i = 0; i < city.reportCount; i++) {
      const district = pick(city.districts);
      const daysAgo = Math.floor(Math.random() * 7);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const doc: Record<string, any> = {
        userId: `mock_user_${Math.floor(Math.random() * userCount)}`,
        userName: `Kullanıcı_${reportCount}`,
        type: pick(VIOLATION_TYPES),
        photoUrl: pick(PHOTO_URLS),
        location: {
          latitude: city.coords.lat + (Math.random() - 0.5) * 0.1,
          longitude: city.coords.lon + (Math.random() - 0.5) * 0.1,
          address: `${district}, ${city.name}`,
          city: city.name,
          district,
        },
        status: 'pending',
        verifications: 0,
        points: 15,
        isMock: true,
        createdAt: firestore.Timestamp.fromDate(createdAt),
      };

      if (Math.random() > 0.7) {
        doc.note = 'Test ihbarı';
      }

      reportPromises.push(firestore().collection('reports').add(doc));
      reportCount++;
    }
  }

  await userBatch.commit();
  await Promise.all(reportPromises);

  return {users: userCount, reports: reportCount};
}

export async function deleteAllMockData(): Promise<{users: number; reports: number}> {
  const [usersSnap, reportsSnap] = await Promise.all([
    firestore().collection('users').where('isMock', '==', true).get(),
    firestore().collection('reports').where('isMock', '==', true).get(),
  ]);

  await Promise.all([
    ...usersSnap.docs.map(d => d.ref.delete()),
    ...reportsSnap.docs.map(d => d.ref.delete()),
  ]);

  return {users: usersSnap.size, reports: reportsSnap.size};
}

export async function countMockData(): Promise<{users: number; reports: number}> {
  try {
    const [usersSnap, reportsSnap] = await Promise.all([
      firestore().collection('users').where('isMock', '==', true).get(),
      firestore().collection('reports').where('isMock', '==', true).get(),
    ]);
    return {users: usersSnap.size, reports: reportsSnap.size};
  } catch {
    return {users: 0, reports: 0};
  }
}
