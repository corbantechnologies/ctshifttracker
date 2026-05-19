import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Employee, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Employee | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        setLoading(true);
        const docRef = doc(db, 'employees', firebaseUser.uid);
        
        unsubProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as Employee);
            setLoading(false);
          } else {
            try {
              // 1. Check for pre-registered email from HR
              const q = query(collection(db, 'employees'), where('email', '==', firebaseUser.email));
              const preRegSnap = await getDocs(q);
              
              let newEmployee: Employee;
              
              if (!preRegSnap.empty) {
                // Link existing record
                const existingDoc = preRegSnap.docs[0];
                const existingData = existingDoc.data();
                
                newEmployee = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || existingData.email,
                  name: firebaseUser.displayName || existingData.name,
                  role: existingData.role || UserRole.Employee,
                  department: existingData.department || 'Unassigned',
                  isActive: true,
                  otEnabled: existingData.otEnabled !== undefined ? existingData.otEnabled : true,
                  assignedShiftId: existingData.assignedShiftId || '',
                  createdAt: existingData.createdAt || new Date().toISOString()
                };
                
                if (existingDoc.id !== firebaseUser.uid) {
                  await deleteDoc(doc(db, 'employees', existingDoc.id));
                }
              } else {
                // 2. Fresh registration (first user is HR)
                const employeesSnap = await getDocs(collection(db, 'employees'));
                const isFirstUser = employeesSnap.empty;
  
                newEmployee = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: firebaseUser.displayName || 'Unknown',
                  role: isFirstUser ? UserRole.HRAdmin : UserRole.Employee,
                  department: isFirstUser ? 'Administration' : 'Unassigned',
                  isActive: true,
                  otEnabled: true,
                  createdAt: new Date().toISOString(),
                };
              }
              
              await setDoc(docRef, newEmployee);
            } catch (err) {
              console.error('Failed to auto-register user profile:', err);
              setProfile(null);
              setLoading(false);
            }
          }
        }, (err) => {
          console.error('Profile snapshot error:', err);
          setProfile(null);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

