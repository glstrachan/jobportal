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

    async saveJobs(jobs) {
        const jobsData = jobs.map(job => job.toObject ? job.toObject() : job);
        await fs.writeFile(this.dbFilePath, JSON.stringify(jobsData, null, 2), 'utf8');
        console.log(`Saved ${jobsData.length} jobs to database`);
    }

    findNewJobs(currentJobs, previousJobs) {
        // Create a Set of unique identifiers from previous jobs for quick lookup
        const previousJobIds = new Set(previousJobs.map(job => job.uniqueIdentifier));
        
        // Filter current jobs to find ones that weren't in the previous set
        return currentJobs.filter(job => !previousJobIds.has(job.uniqueIdentifier));
    }
}

module.exports = DatabaseHandler;