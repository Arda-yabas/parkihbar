import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export { firebase, auth, firestore, storage };
export { StorageService } from './storage';
export { FirestoreService } from './firestore';
export type { Report, Comment } from './firestore';
export { ensureAnonymousAuth, AuthService } from './auth';
