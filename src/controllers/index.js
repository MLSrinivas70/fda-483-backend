import { askGemini, askGpt } from '../utils/index.js';
import { getDocumentsByDateRange, downloadPDFFromURL, getDocumentsByFeiNumbers, getFirebaseData } from '../utils/pdfExtractor.js';

const getDocumentResult = async(documents) => {

    const categories = [
        'Poor Documentation',
        'Procedures Not Followed',
        'Inadequate Investigations (CAPA)',
        'Lack of Training',
        'Facility & Equipment Issues',
        'Validation Failures',
        'Inadequate Testing',
        'Improper Handling & Storage',
        'Poor Record-Keeping',
        'Adverse Event Reporting Failures'
    ];

    const cfrNumber = [
       '§211.22',
       '§211.25',
       '§211.42',
       '§211.63',
       '§211.67',
       '§211.68',
       '§211.84',
       '§211.100',
       '§211.110',
       '§211.113',
       '§211.115',
       '§211.122',
       '§211.130',
       '§211.160',
       '§211.165',
       '§211.166',
       '§211.180',
       '§211.192',
       '§211.198',
       '§211.208',
    ]
    
    const output = [
        {
            companyName: 'Company Name from the PDF',
            dateOfInspection: 'YYYY-MM-DD (date when inspection was conducted)',
            pdfFileName: 'exact filename of the PDF',
            inspectionNumber: 'inspection number if available, otherwise null',
            inspectionDate: 'YYYY-MM-DD (date when 483 was issued)',
            summary: '2-line summary focusing on key compliance violations and critical issues',
            category: 'Poor Documentation',
            repeatFinding: 'repeatFinding',
            cfrNumber: '§211.208',
        }
    ]

    // Create prompt for analysis
    const prompt = `
    Analyze FDA 483 inspection reports and extract key information in JSON format.
    
    For each observation found, create an object with:
    - companyName: Company name from PDF
    - dateOfInspection: YYYY-MM-DD (inspection date)
    - pdfFileName: Exact PDF filename
    - inspectionNumber: Inspection number or null
    - inspectionDate: YYYY-MM-DD (483 issue date)
    - summary: 2-line summary of compliance violations
    - category: One from: ${JSON.stringify(categories)}
    - repeatFinding: "Yes" if repeat finding, "No" otherwise
    - cfrNumber: One from: ${JSON.stringify(cfrNumber)}
    
    Rules:
    - Create separate object for each observation
    - Don't combine observations from same company
    - Be concise and focused
    - Return valid JSON array only
    
    Output format: ${JSON.stringify(output)}
    `;
    
    // Get AI analysis with PDF files
    // const result = await askGpt(prompt, documents);
    const result = await askGemini(prompt, documents);
    
    // Try to parse the JSON response
    let parsedResult;
    try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
        } else {
            parsedResult = JSON.parse(result);
        }
    } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
    }
    
    return parsedResult
}

export const fetchTimeAnalysis = async (startDate, endDate) => {
    const apiStartTime = Date.now();
    console.log(`[API] /timeAnalysis endpoint called at ${new Date().toISOString()}`);
    console.log(`[API] Date range: ${startDate} to ${endDate}`);
    
    try {
        // Get documents from Firestore based on date range
        const firestoreStartTime = Date.now();
        console.log(`[API] Starting Firestore query for documents`);
        const documents = await getDocumentsByDateRange(startDate, endDate);
        const firestoreEndTime = Date.now();
        console.log(`[API] Firestore query completed in ${firestoreEndTime - firestoreStartTime}ms`);
        console.log(`[API] Documents found in date range: ${documents.length}`);
        
        if (documents.length === 0) {
            const totalTime = Date.now() - apiStartTime;
            console.log(`[API] No documents found. Total API time: ${totalTime}ms`);
            return { error: `No documents found in Firebase Firestore for the date range: ${startDate} to ${endDate}` };
        }
        
        console.log(`[API] Processing documents:`, documents.map(d => d.companyName));
        
        // Process documents with LLM
        const llmStartTime = Date.now();
        const result = await getDocumentResult(documents);
        const llmEndTime = Date.now();
        console.log(`[API] LLM processing completed in ${llmEndTime - llmStartTime}ms`);

        const totalApiTime = Date.now() - apiStartTime;
        console.log(`[API] Total /timeAnalysis API call completed in ${totalApiTime}ms`);
        console.log(`[API] Breakdown: Firestore=${firestoreEndTime - firestoreStartTime}ms, LLM=${llmEndTime - llmStartTime}ms`);

        return result;        
    } catch (error) {
        const totalTime = Date.now() - apiStartTime;
        console.error(`[API] Error in fetchTimeAnalysis after ${totalTime}ms:`, error);
        return { error: 'Failed to process request', details: error.message };
    }
}

export const fetchFeiNumbers = async(feiNumbers) => {
    try {
        const documents = await getDocumentsByFeiNumbers(feiNumbers);
        if (documents.length === 0) {
            return { error: `No documents found in Firebase Firestore for the feiNumbers: ${feiNumbers}` };
        }
        const result = await getDocumentResult(documents);
        return result;
    } catch (error) {
        console.error('Error in fetchFeiNumbers:', error);
        return { error: 'Failed to process request', details: error.message };
    }
}

export const fetchFirebaseData = async() => {
    try {
        const documents = await getFirebaseData();
        if (documents.length === 0) {
            return { error: `No documents found in Firebase Firestore for the date range: ${startDate} to ${endDate}` };
        }
        return documents;
    } catch (error) {
        console.error('Error in fetchFirebaseData:', error);
        return { error: 'Failed to process request', details: error.message };
    }
}
