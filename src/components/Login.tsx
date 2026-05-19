import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '../types';
import { LogIn, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'employees', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // 1. Check for pre-registered email from HR
        const q = query(collection(db, 'employees'), where('email', '==', user.email));
        const preRegSnap = await getDocs(q);
        
        let newEmployee;
        
        if (!preRegSnap.empty) {
          // Link existing record
          const existingDoc = preRegSnap.docs[0];
          const existingData = existingDoc.data();
          
          newEmployee = {
            ...existingData,
            uid: user.uid,
            name: user.displayName || existingData.name, // prefer google name
            isActive: true,
            updatedAt: new Date().toISOString()
          };
          
          // Delete old doc if it has a random ID (i.e. ID != email if we use random IDs)
          // Actually, if HR added by email, they might have used email as ID or random ID.
          // In my proposed HR logic, I will use random IDs.
          if (existingDoc.id !== user.uid) {
            await deleteDoc(doc(db, 'employees', existingDoc.id));
          }
        } else {
          // 2. Fresh registration (first user is HR)
          const employeesSnap = await getDocs(collection(db, 'employees'));
          const isFirstUser = employeesSnap.empty;

          newEmployee = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Unknown',
            role: isFirstUser ? UserRole.HRAdmin : UserRole.Employee,
            department: isFirstUser ? 'Administration' : 'Unassigned',
            isActive: true,
            otEnabled: true,
            createdAt: new Date().toISOString(),
          };
        }
        
        await setDoc(userRef, newEmployee);
        toast.success(`Welcome to ShiftFlow, ${newEmployee.name}!`);
      } else {
        toast.success(`Welcome back, ${user.displayName}!`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Abstract Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full -ml-48 -mb-48"></div>
      
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl relative z-10 p-4">
        <CardHeader className="text-center pb-8 border-b border-slate-800">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-blue-900/20">
            <Clock className="h-7 w-7" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">ShiftFlow</CardTitle>
          <CardDescription className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">Enterprise Attendance Manager</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-10">
          <Button 
            onClick={handleLogin} 
            className="w-full h-14 text-sm font-bold uppercase tracking-wider bg-white text-slate-900 hover:bg-slate-100 transition-all rounded-xl border-none"
          >
            <LogIn className="mr-3 h-5 w-5" />
            Proceed with Enterprise Auth
          </Button>
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-slate-800"></div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Internal Use Only</span>
            <div className="h-px flex-1 bg-slate-800"></div>
          </div>
          <p className="text-[10px] text-center text-slate-500 font-medium leading-relaxed uppercase tracking-tight">
            Unauthorized access to this portal is strictly prohibited. All activity is logged and monitored for compliance.
          </p>
        </CardContent>
        <div className="pt-4 text-center">
           <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Powered by ChronosSync v2.4</span>
        </div>
      </Card>
    </div>
  );
}
