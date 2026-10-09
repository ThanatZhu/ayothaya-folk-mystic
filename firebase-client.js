import {firebaseConfig} from './firebase-config.js';
let ready;
export function deadline(promise,ms=15000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('connection-timeout')),ms);promise.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
export function connectFirebase(){
 return ready??=(async()=>{
  const [app,a,f]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')]);
  const instance=app.initializeApp(firebaseConfig),auth=a.getAuth(instance),db=f.getFirestore(instance);
  auth.languageCode='th';await a.setPersistence(auth,a.browserLocalPersistence);await auth.authStateReady();
  return {sdk:{...a,...f},auth,db};
 })();
}
