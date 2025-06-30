import { bucket, db } from './firebase.js';

export const getPDFFiles = async () => {
    try {
        const [files] = await bucket.getFiles();
        const pdfFiles = files
            .filter(file => file.name.toLowerCase().endsWith('.pdf'))
            .map(file => file.name);
        
        return pdfFiles;
    } catch (error) {
        console.error('Error reading PDF files from Firebase:', error);
        return [];
    }
};

export const getDocumentsByDateRange = async (startDate, endDate) => {
    try {
        console.log(`Fetching documents from Firestore between ${startDate} and ${endDate}`);
        
        // Convert date strings to Date objects for comparison
        const start = startDate;
        const end = endDate;
        
        // Query Firestore collection
        const snapshot = await db.collection('fda-483-documents').get();
        
        const documents = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const docDate = new Date(data.date).getTime();
            
            // Check if document date falls within the range
            if (docDate >= start && docDate <= end) {
                documents.push({
                    id: doc.id,
                    companyName: data.name || 'Company',
                    date: data.date,
                    url: data.url,
                    fileName: data.url.split('/').pop() // Extract filename from URL
                });
            }
        });
        
        console.log(`Found ${documents.length} documents in date range`);
        console.log(documents, 'documentsjdsfhdjkh')
        return documents;
        
    } catch (error) {
        console.error('Error fetching documents from Firestore:', error);
        return [];
    }
};

export const getDocumentsByFeiNumbers = async (feiNumbers) => {
    try {
        console.log('Fetching documents by FEI numbers:', feiNumbers);
        const snapshot = await db.collection('fda-483-documents').where('fei_number', 'in', feiNumbers).get();
        const documents = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            documents.push({
                id: doc.id,
                companyName: data.name || 'Company',
                date: data.date,
                url: data.url,
                fileName: data.url.split('/').pop() // Extract filename from URL
            });
        });
        console.log(`Found ${documents.length} documents by FEI numbers`);
        console.log(documents, 'documentsdocumentsas')
        return documents;
    } catch (error) {
        console.error('Error fetching documents from Firestore:', error);
        return [];
    }
};

export const getFirebaseData = async() => {
    try {
        const snapshot = await db.collection('fda-483-documents').get();
        const documents = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            documents.push(data);
        });
        return documents;
    } catch (error) {
        console.error('Error fetching documents from Firestore:', error);
        return [];
    }
};

export const downloadPDFFromFirebase = async (fileName) => {
    try {
        const file = bucket.file(fileName);
        const [buffer] = await file.download();
        return buffer;
    } catch (error) {
        console.error(`Error downloading PDF ${fileName} from Firebase:`, error);
        throw error;
    }
};

export const downloadPDFFromURL = async (url) => {
    console.log(url, 'urlurlurlurl')
    try {
        // Handle new clean public URLs: https://storage.googleapis.com/bucket-name/path/to/file.pdf
        const urlObj = new URL(url);
        
        // Extract the file path from the clean public URL
        // URL format: https://storage.googleapis.com/fda-483.firebasestorage.app/fda-483-documents/filename.pdf
        // We need to get everything after the bucket name
        const pathParts = urlObj.pathname.split('/');
        
        // The path should be: ["", "fda-483.firebasestorage.app", "fda-483-documents", "filename.pdf"]
        // We want everything after the bucket name (index 1)
        const filePath = pathParts.slice(2).join('/');
        
        if (!filePath) {
            throw new Error('Invalid Firebase Storage URL format');
        }
        
        console.log('Extracted file path:', filePath);
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        return buffer;
    } catch (error) {
        console.error(`Error downloading PDF from URL ${url}:`, error);
        throw error;
    }
}; 