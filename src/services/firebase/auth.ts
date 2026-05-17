import auth from '@react-native-firebase/auth';

export async function ensureAnonymousAuth(): Promise<void> {
  if (auth().currentUser) {
    return;
  }
  await auth().signInAnonymously();
}

export const AuthService = {
  getCurrentUser() {
    return auth().currentUser;
  },

  async signOut(): Promise<void> {
    await auth().signOut();
  },
};
