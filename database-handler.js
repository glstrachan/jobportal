const fs = require('fs').promises;
const path = require('path');

class DatabaseHandler {
    constructor(dbFilePath = 'jobs-database.json') {
        this.dbFilePath = dbFilePath;
    }

    async loadJobs() {
        try {
            const data = await fs.readFile(this.dbFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // If file doesn't exist or is invalid, return empty array
            console.log(`No existing database found or error reading database: ${error.message}`);
            return [];
        }
    }

    async saveJobs(currentJobs, previousJobs = []) {
        // Create a map of previous jobs keyed by uniqueIdentifier for quick lookup
        const previousJobsMap = new Map(
            previousJobs.map(job => [job.uniqueIdentifier, job])
        );
        
        // Process each current job
        const jobsToSave = currentJobs.map(job => {
            const jobData = job.toObject ? job.toObject() : job;
            const existingJob = previousJobsMap.get(jobData.uniqueIdentifier);
            
            // If this job already exists in our database, preserve its original scrapeDate
            if (existingJob) {
                return {
                    ...jobData,
                    scrapeDate: existingJob.scrapeDate // Keep the original scrape date
                };
            }
            
            // This is a new job, keep its current scrapeDate
            return jobData;
        });
        
        // Save to file
        await fs.writeFile(this.dbFilePath, JSON.stringify(jobsToSave, null, 2), 'utf8');
        console.log(`Saved ${jobsToSave.length} jobs to database`);
        
        return jobsToSave;
    }

    findNewJobs(currentJobs, previousJobs) {
        // Create a Set of unique identifiers from previous jobs for quick lookup
        const previousJobIds = new Set(previousJobs.map(job => job.uniqueIdentifier));
        
        // Filter current jobs to find ones that weren't in the previous set
        return currentJobs.filter(job => !previousJobIds.has(job.uniqueIdentifier));
    }
}

module.exports = DatabaseHandler;
