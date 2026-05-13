import { auth } from './config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const loginAdmin = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerAdmin = async (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logoutAdmin = async () => {
  return signOut(auth);
};
