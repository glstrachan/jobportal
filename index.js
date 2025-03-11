const { JaneStreetScraper, CitadelScraper } = require('./scrapers');
const DatabaseHandler = require('./database-handler');
const EmailNotifier = require('./email-notifier');

async function main() {
    try {
        console.log('Starting job scraper...');
        
        // Initialize scrapers
        const janeStreetScraper = new JaneStreetScraper();
        const citadelScraper = new CitadelScraper();
        
        // Run scrapers
        console.log('Running scrapers...');
        const janeStreetJobs = await janeStreetScraper.scrape();
        const citadelJobs = await citadelScraper.scrape();
        
        // Combine all jobs
        const allJobs = [...janeStreetJobs, ...citadelJobs];
        console.log(`Total jobs found: ${allJobs.length}`);
        
        // Initialize database handler
        const dbHandler = new DatabaseHandler();
        
        // Load previous jobs
        console.log('Loading previous jobs from database...');
        const previousJobs = await dbHandler.loadJobs();
        console.log(`Loaded ${previousJobs.length} previous jobs`);
        
        // Find new jobs
        console.log('Identifying new jobs...');
        const newJobs = dbHandler.findNewJobs(allJobs, previousJobs);
        console.log(`Found ${newJobs.length} new jobs`);
        
        // Save all jobs back to the database while preserving original scrape dates
        console.log('Saving all jobs to database...');
        await dbHandler.saveJobs(allJobs, previousJobs);
        
        // Send email notification if there are new jobs
        if (newJobs.length > 0) {
            console.log('Sending email notification...');
            const emailConfig = {
                email: process.env.EMAIL_USER,
                password: process.env.EMAIL_PASSWORD,
                recipientEmail: process.env.RECIPIENT_EMAIL
            };
            
            const emailNotifier = new EmailNotifier(emailConfig);
            await emailNotifier.sendNewJobsNotification(newJobs);
            console.log('Email notification sent successfully');
        } else {
            console.log('No new jobs found, no email notification needed');
        }
        
        console.log('Job scraper completed successfully');
    } catch (error) {
        console.error('Error running job scraper:', error);
        process.exit(1);
    }
}

// Run the main function
main();
