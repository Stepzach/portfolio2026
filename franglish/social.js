import { firebaseConfig } from './firebase-config.js';
export const social = { configured: Boolean(firebaseConfig?.projectId), ready: false, user: null, error: null };
let auth, db, fs, fa;
export const ready = (async () => {
  if (!social.configured) return;
  try {
    const [app, authSDK, firestoreSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js')
    ]);
    fa=authSDK; fs=firestoreSDK;
    const firebase=app.initializeApp(firebaseConfig);
    auth=fa.getAuth(firebase); db=fs.getFirestore(firebase);
    await auth.authStateReady(); social.user=auth.currentUser; social.ready=true;
    fa.onAuthStateChanged(auth,user=>{social.user=user;window.dispatchEvent(new CustomEvent('auth-change'));});
  } catch(e) { social.error=e; }
})();
async function ensureVisitor(){await ready;if(!social.ready)throw Error('Couldn’t connect. Please try again.');const user=auth.currentUser||(await fa.signInAnonymously(auth)).user;social.user=user;return user;}
export async function signOut(){await ready;if(social.ready)await fa.signOut(auth);}
export async function toggleLike(id){await ready;if(!social.ready)throw Error('Couldn’t connect. Please try again.');await ensureVisitor();const ref=fs.doc(db,'atablePlaces',id,'likes',social.user.uid);await fs.runTransaction(db,async tx=>{const old=await tx.get(ref);if(old.exists())tx.delete(ref);else tx.set(ref,{uid:social.user.uid,createdAt:fs.serverTimestamp()});});}
export function watchLikes(id,callback,onError){if(!social.ready)return()=>{};return fs.onSnapshot(fs.collection(db,'atablePlaces',id,'likes'),snap=>callback(snap.docs.map(d=>d.id)),onError);}