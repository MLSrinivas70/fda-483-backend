import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Function to download file from URL with retry logic
const downloadFile = async (url, filename, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`  📥 Attempt ${attempt}/${retries}: Downloading from ${url}`);
            
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: 60000, // 60 second timeout
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            // Check if response is successful
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const writer = fs.createWriteStream(filename);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    writer.close();
                    resolve(filename);
                });
                writer.on('error', (err) => {
                    fs.unlink(filename, () => {}); // Clean up partial file
                    reject(err);
                });
            });
        } catch (error) {
            console.log(`  ❌ Attempt ${attempt} failed: ${error.message}`);
            
            if (attempt === retries) {
                throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

// Main function to download all files
const downloadAllFiles = async () => {
    try {
        console.log('📖 Reading FDA documents JSON file...');
        
        // Read the JSON file
        const jsonData = JSON.parse(fs.readFileSync('./fda-documents.json', 'utf8'));
        console.log(`📊 Found ${jsonData.length} documents to download`);
        
        const uploadsDir = './uploads';
        
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
            console.log(`📁 Created uploads directory: ${uploadsDir}`);
        }
        
        let downloaded = 0;
        let failed = 0;
        let skipped = 0;
        const failedDownloads = [];
        
        for (let i = 0; i < jsonData.length; i++) {
            const doc = jsonData[i];
            console.log(`\n🔄 Processing ${i + 1}/${jsonData.length}: ${doc.Legal_Name}`);
            
            try {
                // Create safe filename
                const safeName = doc.Legal_Name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                const dateStr = doc.Record_Date.replace(/\//g, '-');
                const filename = `${safeName}_${dateStr}_${doc.FEI_Number}.pdf`;
                const filePath = path.join(uploadsDir, filename);
                
                // Check if file already exists
                if (fs.existsSync(filePath)) {
                    console.log(`  ⏭️  File already exists, skipping: ${filename}`);
                    skipped++;
                    continue;
                }
                
                // Download the file
                await downloadFile(doc.Download, filePath);
                console.log(`  ✅ Downloaded: ${filename}`);
                downloaded++;
                
                // Add a small delay between downloads to be respectful to the server
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`  ❌ Error downloading ${doc.Legal_Name}:`, error.message);
                failed++;
                failedDownloads.push({
                    company: doc.Legal_Name,
                    url: doc.Download,
                    error: error.message,
                    index: i + 1
                });
            }
        }
        
        // Summary
        console.log(`\n📊 Download Summary:`);
        console.log(`  ✅ Successfully downloaded: ${downloaded}`);
        console.log(`  ⏭️  Skipped (already exists): ${skipped}`);
        console.log(`  ❌ Failed downloads: ${failed}`);
        console.log(`  📁 Total processed: ${jsonData.length}`);
        
        // Show files in uploads directory
        const files = fs.readdirSync(uploadsDir).filter(file => file.endsWith('.pdf'));
        console.log(`\n📁 Files in uploads directory: ${files.length}`);
        
        if (failedDownloads.length > 0) {
            console.log(`\n❌ Failed Downloads:`);
            failedDownloads.forEach(item => {
                console.log(`  ${item.index}. ${item.company}: ${item.error}`);
            });
            
            // Save failed downloads to file
            const failedFile = './failed-downloads.json';
            fs.writeFileSync(failedFile, JSON.stringify(failedDownloads, null, 2));
            console.log(`\n📄 Failed downloads saved to: ${failedFile}`);
        }
        
        return {
            downloaded,
            skipped,
            failed,
            total: jsonData.length,
            filesInUploads: files.length
        };
        
    } catch (error) {
        console.error('❌ Error downloading files:', error.message);
        throw error;
    }
};

// Run the script
downloadAllFiles(); 