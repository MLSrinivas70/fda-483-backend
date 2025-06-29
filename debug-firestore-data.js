import { db } from './src/utils/firebase.js';

async function debugFirestoreData() {
    try {
        console.log('🔍 Debugging Firestore data...');
        
        const snapshot = await db.collection('fda-483-documents').limit(3).get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('\n📋 Document ID:', doc.id);
            console.log('📊 Raw data:', JSON.stringify(data, null, 2));
            console.log('🔍 Data types:');
            console.log('  - date:', typeof data.date, 'value:', data.date);
            console.log('  - name:', typeof data.name, 'value:', data.name);
            console.log('  - fei_number:', typeof data.fei_number, 'value:', data.fei_number);
            console.log('  - url:', typeof data.url, 'value:', data.url);
        });
        
    } catch (error) {
        console.error('❌ Error debugging Firestore data:', error);
    }
}

debugFirestoreData(); 