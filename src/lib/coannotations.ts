import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { Annotation } from './types';

import { app } from '../app/firebaseConfig';
const db = getFirestore(app);

export async function createCollaboration(): Promise<string> {
    const collaborationRef = doc(collection(db, 'collaboration'));
    return collaborationRef.id;
}

export async function fetchAllUserAnnotations(collaborationId: string, paperId: string): Promise<Annotation[]> {
  const usersCollectionRef = collection(db, 'collaboration', collaborationId, 'papers', paperId, 'users');
  const userSnapshots = await getDocs(usersCollectionRef);
  const fetchedAnnotations: Annotation[] = [];
  
  userSnapshots.forEach((doc) => {
    const annotation = doc.data();
    console.log('annotation:', annotation);
  });

  // Iterate through each user to get their annotations
  for (const userDoc of userSnapshots.docs) {
    const annotationsCollectionRef = collection(userDoc.ref, 'annotations'); // Correctly get annotations collection
    const annotationsSnapshot = await getDocs(annotationsCollectionRef);
    console.log('Fetched annotations:', annotationsSnapshot.docs);

    annotationsSnapshot.forEach((doc) => {
      const annotation = doc.data() as Annotation;
      fetchedAnnotations.push({ ...annotation }); // Optionally include userId in each annotation
    });
  }

  console.log('Fetched annotations:', fetchedAnnotations);

  return fetchedAnnotations;
}



export async function addAnnotation(collaborationId: string, userId: string, paperId: string, annotation: Annotation): Promise<void> {
    const annotationDocRef = doc(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations', annotation.id);
    await setDoc(annotationDocRef, annotation);
}

export async function updateAnnotation(collaborationId: string, userId: string, paperId: string, annotation: Annotation): Promise<void> {
    const annotationDocRef = doc(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations', annotation.id);
    await setDoc(annotationDocRef, annotation, { merge: true });
}

export async function deleteAnnotation(collaborationId: string, userId: string, paperId: string, annotationId: string): Promise<void> {
    const annotationDocRef = doc(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations', annotationId);
    await deleteDoc(annotationDocRef);
}